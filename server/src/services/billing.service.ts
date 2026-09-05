import { prisma } from '../lib/prisma';
import { logAudit } from './audit.service';

/**
 * Generates invoice for a confirmed quotation.
 * Atomic invoice number: timestamp+random suffix pattern to avoid race conditions.
 */
export async function generateInvoicesAndSubscriptions(quoteId: string, userId: string, userName: string, userRole: string) {
  const quote = await prisma.quotation.findUnique({
    where: { id: quoteId },
    include: {
      customer: true,
      lines: { include: { product: true } },
    },
  });

  if (!quote) throw new Error('Quotation not found');

  let oneTimeInvoice = null;

  // Generate Commercial Invoice for all quote lines
  if (quote.lines.length > 0) {
    let subtotal = 0;
    let taxAmount = 0;

    const invoiceLinesData = quote.lines.map((l) => {
      subtotal += l.netPrice;
      taxAmount += l.taxAmount;
      return {
        description: `${l.product.name} (Qty: ${l.quantity})`,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        amount: l.totalAmount,
      };
    });

    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
    // ── Atomic invoice number: timestamp + random suffix avoids race condition ──
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    oneTimeInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        quotationId: quote.id,
        customerId: quote.customerId,
        type: 'ONE_TIME',
        status: 'ISSUED',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Net 30
        subtotal: Math.round(subtotal * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        totalAmount,
        paidAmount: 0.0,
        balanceAmount: totalAmount,
        lines: { create: invoiceLinesData },
      },
    });

    await logAudit({
      actorId: userId,
      actorName: userName,
      actorRole: userRole,
      entityType: 'INVOICE',
      entityId: oneTimeInvoice.id,
      action: 'INVOICE_CREATED',
      afterState: { invoiceNumber, totalAmount, type: 'ONE_TIME' },
      reason: 'Generated commercial invoice from confirmed quotation.',
    });
  }

  return {
    oneTimeInvoice,
    invoice: oneTimeInvoice,
  };
}

/**
 * Records a payment against an invoice and updates outstanding balance.
 */
export async function recordPayment({
  invoiceId,
  amount,
  paymentMethod,
  reference,
  notes,
  userId,
  userName,
  userRole,
}: {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  notes?: string;
  userId: string;
  userName: string;
  userRole: string;
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) throw new Error('Invoice not found');
  if (amount <= 0) throw new Error('Payment amount must be greater than zero');
  if (amount > invoice.balanceAmount + 0.01) {
    throw new Error(`Payment amount (₹${amount}) exceeds outstanding invoice balance (₹${invoice.balanceAmount}).`);
  }

  const beforeState = { paidAmount: invoice.paidAmount, balanceAmount: invoice.balanceAmount, status: invoice.status };

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount,
      paymentMethod,
      reference,
      paymentDate: new Date(),
      notes,
    },
  });

  const newPaid = Math.round((invoice.paidAmount + amount) * 100) / 100;
  const newBalance = Math.max(0, Math.round((invoice.totalAmount - newPaid) * 100) / 100);
  const newStatus = newBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';

  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paidAmount: newPaid,
      balanceAmount: newBalance,
      status: newStatus,
    },
  });

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: userRole,
    entityType: 'INVOICE',
    entityId: invoiceId,
    action: 'PAYMENT_RECORDED',
    beforeState,
    afterState: { paidAmount: newPaid, balanceAmount: newBalance, status: newStatus },
    reason: `Recorded payment of ₹${amount} via ${paymentMethod} (Ref: ${reference}).`,
  });

  return { payment, invoice: updatedInvoice };
}

/**
 * Calculates proration adjustment for mid-cycle subscription changes.
 * Formula:
 * period_value = unit_price * quantity
 * daily_rate = period_value / days_in_period
 * prorated_value = daily_rate * affected_days
 */
export function calculateProration({
  unitPrice,
  oldQuantity,
  newQuantity,
  daysInPeriod,
  remainingDays,
}: {
  unitPrice: number;
  oldQuantity: number;
  newQuantity: number;
  daysInPeriod: number;
  remainingDays: number;
}) {
  const oldPeriodValue = unitPrice * oldQuantity;
  const newPeriodValue = unitPrice * newQuantity;

  const oldDailyRate = oldPeriodValue / daysInPeriod;
  const newDailyRate = newPeriodValue / daysInPeriod;

  const unusedOldValue = Math.round((oldDailyRate * remainingDays) * 100) / 100;
  const newRemainingValue = Math.round((newDailyRate * remainingDays) * 100) / 100;

  const netAdjustment = Math.round((newRemainingValue - unusedOldValue) * 100) / 100;

  return {
    unusedOldValue,
    newRemainingValue,
    netAdjustment, // positive = charge customer, negative = credit customer
  };
}
