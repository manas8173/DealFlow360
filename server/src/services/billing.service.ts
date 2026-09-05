import { PrismaClient } from '@prisma/client';
import { logAudit } from './audit.service';

const prisma = new PrismaClient();

/**
 * Generates hybrid one-time invoice and recurring subscription schedules for a confirmed quotation.
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

  const oneTimeLines = quote.lines.filter((l) => !l.isRecurring);
  const recurringLines = quote.lines.filter((l) => l.isRecurring);

  let oneTimeInvoice = null;

  // 1. Generate One-Time Invoice
  if (oneTimeLines.length > 0) {
    let subtotal = 0;
    let taxAmount = 0;

    const invoiceLinesData = oneTimeLines.map((l) => {
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
    const invCount = await prisma.invoice.count();
    const invoiceNumber = `INV-${1000 + invCount + 1}`;

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
      reason: 'Generated one-time invoice from confirmed quotation.',
    });
  }

  // 2. Generate Recurring Subscriptions & Billing Schedules
  const subscriptionsCreated = [];

  for (const line of recurringLines) {
    const startDate = new Date();
    const cycle = line.billingCycle || 'MONTHLY';
    const periodDays = cycle === 'WEEKLY' ? 7 : cycle === 'MONTHLY' ? 30 : cycle === 'QUARTERLY' ? 90 : 365;
    const nextBillingDate = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        quotationId: quote.id,
        customerId: quote.customerId,
        productId: line.productId,
        planName: `${line.product.name} (${cycle})`,
        billingCycle: cycle,
        status: 'ACTIVE',
        startDate,
        currentPeriodStart: startDate,
        currentPeriodEnd: nextBillingDate,
        nextBillingDate,
        quantity: line.quantity,
        unitPrice: line.totalAmount,
      },
    });

    // Generate upcoming 4 recurring billing schedule entries
    for (let i = 1; i <= 4; i++) {
      const scheduleDate = new Date(Date.now() + (periodDays * i) * 24 * 60 * 60 * 1000);
      await prisma.billingSchedule.create({
        data: {
          subscriptionId: subscription.id,
          quotationId: quote.id,
          invoiceDate: scheduleDate,
          amount: line.totalAmount,
          status: 'SCHEDULED',
        },
      });
    }

    subscriptionsCreated.push(subscription);

    await logAudit({
      actorId: userId,
      actorName: userName,
      actorRole: userRole,
      entityType: 'SUBSCRIPTION',
      entityId: subscription.id,
      action: 'SUBSCRIPTION_CREATED',
      afterState: { planName: subscription.planName, nextBillingDate },
      reason: 'Generated recurring subscription schedule from quote line.',
    });
  }

  return {
    oneTimeInvoice,
    subscriptions: subscriptionsCreated,
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
