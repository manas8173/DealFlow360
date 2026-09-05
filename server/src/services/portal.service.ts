import { PrismaClient } from '@prisma/client';
import { calculateLinePricing } from './pricing.service';
import { calculateBlendedRisk } from './risk.service';
import { logAudit } from './audit.service';
import { generateInvoicesAndSubscriptions } from './billing.service';

const prisma = new PrismaClient();

/**
 * Creates a customer change request or counter-discount proposal.
 */
export async function createCustomerChangeRequest({
  quotationId,
  customerId,
  lineId,
  requestedDiscountPercent,
  requestedQuantity,
  notes,
}: {
  quotationId: string;
  customerId: string;
  lineId?: string;
  requestedDiscountPercent?: number;
  requestedQuantity?: number;
  notes?: string;
}) {
  const quote = await prisma.quotation.findFirst({
    where: { id: quotationId, customerId },
    include: { customer: true },
  });

  if (!quote) throw new Error('Forbidden or Quotation not found for customer');

  const changeReq = await prisma.changeRequest.create({
    data: {
      quotationId,
      customerId,
      lineId: lineId || null,
      requestedDiscountPercent: requestedDiscountPercent ?? null,
      requestedQuantity: requestedQuantity ?? null,
      notes: notes || 'Customer submitted counter proposal',
      status: 'PENDING',
    },
  });

  // Also record message in NegotiationThread
  let thread = await prisma.negotiationThread.findUnique({
    where: { quotationId },
  });
  if (!thread) {
    thread = await prisma.negotiationThread.create({
      data: { quotationId, status: 'OPEN' },
    });
  }

  const proposalText = requestedDiscountPercent !== undefined
    ? `Proposed Counter Discount: ${requestedDiscountPercent}%`
    : `Proposed Quantity Change: ${requestedQuantity}`;

  await prisma.negotiationMessage.create({
    data: {
      threadId: thread.id,
      senderRole: 'CUSTOMER',
      senderName: quote.customer.name,
      content: `[CHANGE REQUEST] ${proposalText}. Notes: ${notes || 'None'}`,
    },
  });

  // Transition quote status to UNDER_NEGOTIATION
  await prisma.quotation.update({
    where: { id: quotationId },
    data: { status: 'UNDER_NEGOTIATION' },
  });

  await logAudit({
    actorId: customerId,
    actorName: quote.customer.name,
    actorRole: 'CUSTOMER',
    entityType: 'QUOTATION',
    entityId: quotationId,
    action: 'CUSTOMER_COUNTERED_DISCOUNT',
    afterState: { changeRequestId: changeReq.id, requestedDiscountPercent, requestedQuantity },
    reason: notes || 'Submitted counter discount via Customer Portal',
  });

  return changeReq;
}

/**
 * Internal Sales Rep / Manager accepts customer change request.
 * Recalculates totals, risk, margin, and triggers AUTOMATIC RE-APPROVAL if risk > LOW.
 */
export async function acceptCustomerChangeRequest({
  changeRequestId,
  userId,
  userName,
  userRole,
}: {
  changeRequestId: string;
  userId: string;
  userName: string;
  userRole: string;
}) {
  const changeReq = await prisma.changeRequest.findUnique({
    where: { id: changeRequestId },
    include: {
      quotation: {
        include: {
          customer: true,
          lines: { include: { product: true } },
        },
      },
    },
  });

  if (!changeReq) throw new Error('Change request not found');
  if (changeReq.status !== 'PENDING') throw new Error(`Change request is already ${changeReq.status}`);

  const quote = changeReq.quotation;
  const beforeState = {
    quoteNumber: quote.quoteNumber,
    version: quote.version,
    status: quote.status,
    riskBand: quote.riskBand,
    netTotal: quote.netTotal,
  };

  // Apply change request modifications to lines
  if (changeReq.lineId) {
    const lineToUpdate = quote.lines.find((l) => l.id === changeReq.lineId);
    if (lineToUpdate) {
      const newDiscount = changeReq.requestedDiscountPercent ?? lineToUpdate.discountPercent;
      const newQty = changeReq.requestedQuantity ?? lineToUpdate.quantity;

      const pricing = await calculateLinePricing({
        productId: lineToUpdate.productId,
        variantId: lineToUpdate.variantId || undefined,
        quantity: newQty,
        discountPercent: newDiscount,
        customerTier: quote.customer.tier,
      });

      await prisma.quotationLine.update({
        where: { id: changeReq.lineId },
        data: {
          quantity: pricing.quantity,
          discountPercent: pricing.discountPercent,
          effectiveCeiling: pricing.effectiveCeiling,
          overagePoints: pricing.overagePoints,
          status: pricing.status,
          netPrice: pricing.netPrice,
          taxAmount: pricing.taxAmount,
          totalAmount: pricing.totalAmount,
          marginAmount: pricing.marginAmount,
          marginPercent: pricing.marginPercent,
        },
      });
    }
  }

  // Reload updated quotation lines
  const reloadedLines = await prisma.quotationLine.findMany({
    where: { quotationId: quote.id },
    include: { product: true },
  });

  // Recalculate Quote Totals & Blended Risk
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let netTotal = 0;
  let totalMargin = 0;

  const linesForRisk = reloadedLines.map((line) => {
    subtotal += (line.unitPrice * line.quantity);
    const disc = (line.unitPrice * line.quantity * line.discountPercent / 100);
    totalDiscount += disc;
    totalTax += line.taxAmount;
    netTotal += line.netPrice;
    totalMargin += line.marginAmount;

    return {
      lineName: line.product.name,
      grossPrice: line.unitPrice * line.quantity,
      discountPercent: line.discountPercent,
      effectiveCeiling: line.effectiveCeiling,
      overagePoints: line.overagePoints,
    };
  });

  const totalMarginPercent = netTotal > 0 ? Math.round((totalMargin / netTotal * 100) * 100) / 100 : 0;
  const riskResult = await calculateBlendedRisk(linesForRisk);

  // Increment Quote Version on material change
  const newVersion = quote.version + 1;

  // Mark Change Request ACCEPTED
  await prisma.changeRequest.update({
    where: { id: changeRequestId },
    data: { status: 'ACCEPTED' },
  });

  // Check if Automatic Re-Approval is Required
  let newStatus = 'APPROVED';
  let approvalRequestCreated = null;

  if (riskResult.riskBand !== 'LOW') {
    // Threshold exceeded! AUTOMATIC RE-APPROVAL TRIGGERED
    newStatus = 'PENDING_APPROVAL';

    // Create a NEW ApprovalRequest preserving old approval history!
    approvalRequestCreated = await prisma.approvalRequest.create({
      data: {
        quotationId: quote.id,
        quoteVersion: newVersion,
        status: 'PENDING',
        currentStepIndex: 0,
        steps: {
          create: riskResult.requiredApprovalChain.map((role, idx) => ({
            stepOrder: idx,
            roleRequired: role,
            status: 'PENDING',
          })),
        },
      },
    });
  }

  // Save updated quotation
  const updatedQuotation = await prisma.quotation.update({
    where: { id: quote.id },
    data: {
      version: newVersion,
      status: newStatus,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      netTotal: Math.round(netTotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalMargin: Math.round(totalMargin * 100) / 100,
      totalMarginPercent,
      riskScore: riskResult.riskScore,
      riskBand: riskResult.riskBand,
      riskExplanation: riskResult.explanationJson,
    },
  });

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: userRole,
    entityType: 'QUOTATION',
    entityId: quote.id,
    action: 'CHANGE_ACCEPTED',
    beforeState,
    afterState: {
      version: newVersion,
      status: newStatus,
      riskBand: riskResult.riskBand,
      riskScore: riskResult.riskScore,
      reApprovalTriggered: riskResult.riskBand !== 'LOW',
    },
    reason: `Accepted customer change request #${changeRequestId}. Recalculated risk score: ${riskResult.riskScore} (${riskResult.riskBand}).`,
  });

  return {
    quotation: updatedQuotation,
    reApprovalTriggered: riskResult.riskBand !== 'LOW',
    approvalRequest: approvalRequestCreated,
  };
}

/**
 * Customer confirms quotation from Customer Portal.
 */
export async function confirmQuotationByCustomer(quoteId: string, customerId: string) {
  const quote = await prisma.quotation.findFirst({
    where: { id: quoteId, customerId },
  });

  if (!quote) throw new Error('Forbidden or Quotation not found for customer');
  if (quote.status !== 'APPROVED' && quote.status !== 'SENT') {
    throw new Error(`Cannot confirm quote in status '${quote.status}'. Quote must be APPROVED before confirmation.`);
  }

  const updatedQuote = await prisma.quotation.update({
    where: { id: quoteId },
    data: { status: 'CONFIRMED' },
  });

  // Automatically trigger billing generation
  await generateInvoicesAndSubscriptions(quoteId, customerId, 'Customer', 'CUSTOMER');

  await logAudit({
    actorId: customerId,
    actorName: 'Customer',
    actorRole: 'CUSTOMER',
    entityType: 'QUOTATION',
    entityId: quoteId,
    action: 'CUSTOMER_CONFIRMED',
    afterState: { status: 'CONFIRMED', version: quote.version, confirmedAt: new Date() },
    reason: 'Customer confirmed commercial quotation terms in Customer Portal.',
  });

  return updatedQuote;
}
