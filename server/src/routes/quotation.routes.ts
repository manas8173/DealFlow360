import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { calculateLinePricing } from '../services/pricing.service';
import { calculateBlendedRisk } from '../services/risk.service';
import { submitQuotationForApproval } from '../services/approval.service';
import { logAudit } from '../services/audit.service';

const router = Router();
const prisma = new PrismaClient();

// Helper to recalculate whole quotation totals and risk score
export async function recalculateQuotation(quoteId: string) {
  const quote = await prisma.quotation.findUnique({
    where: { id: quoteId },
    include: {
      customer: true,
      lines: { include: { product: true } },
    },
  });

  if (!quote) throw new Error('Quotation not found');

  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let netTotal = 0;
  let totalMargin = 0;

  const linesForRisk = [];

  for (const line of quote.lines) {
    const updatedLinePricing = await calculateLinePricing({
      productId: line.productId,
      variantId: line.variantId || undefined,
      quantity: line.quantity,
      discountPercent: line.discountPercent,
      customerTier: quote.customer.tier,
    });

    // Update individual line pricing details in DB
    await prisma.quotationLine.update({
      where: { id: line.id },
      data: {
        unitPrice: updatedLinePricing.unitPrice,
        effectiveCeiling: updatedLinePricing.effectiveCeiling,
        overagePoints: updatedLinePricing.overagePoints,
        status: updatedLinePricing.status,
        netPrice: updatedLinePricing.netPrice,
        taxAmount: updatedLinePricing.taxAmount,
        totalAmount: updatedLinePricing.totalAmount,
        costPrice: updatedLinePricing.costPrice,
        marginAmount: updatedLinePricing.marginAmount,
        marginPercent: updatedLinePricing.marginPercent,
      },
    });

    subtotal += updatedLinePricing.grossPrice;
    totalDiscount += updatedLinePricing.discountAmount;
    totalTax += updatedLinePricing.taxAmount;
    netTotal += updatedLinePricing.netPrice;
    totalMargin += updatedLinePricing.marginAmount;

    linesForRisk.push({
      lineName: line.product.name,
      grossPrice: updatedLinePricing.grossPrice,
      discountPercent: updatedLinePricing.discountPercent,
      effectiveCeiling: updatedLinePricing.effectiveCeiling,
      overagePoints: updatedLinePricing.overagePoints,
    });
  }

  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const roundedTotalDiscount = Math.round(totalDiscount * 100) / 100;
  const roundedNetTotal = Math.round(netTotal * 100) / 100;
  const roundedTotalTax = Math.round(totalTax * 100) / 100;
  const roundedTotalMargin = Math.round(totalMargin * 100) / 100;
  const totalMarginPercent = roundedNetTotal > 0 ? Math.round((roundedTotalMargin / roundedNetTotal * 100) * 100) / 100 : 0;

  const riskResult = await calculateBlendedRisk(linesForRisk);

  const updatedQuote = await prisma.quotation.update({
    where: { id: quoteId },
    data: {
      subtotal: roundedSubtotal,
      totalDiscount: roundedTotalDiscount,
      netTotal: roundedNetTotal,
      totalTax: roundedTotalTax,
      totalMargin: roundedTotalMargin,
      totalMarginPercent,
      riskScore: riskResult.riskScore,
      riskBand: riskResult.riskBand,
      riskExplanation: riskResult.explanationJson,
    },
    include: {
      customer: true,
      lines: { include: { product: true, variant: true } },
    },
  });

  return updatedQuote;
}

// GET /api/quotations - List quotations with optional filters
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { status, customerId } = req.query;
    const whereClause: any = {};

    if (status) whereClause.status = status as string;
    if (customerId) whereClause.customerId = customerId as string;

    // Filter customer user to see only own customer quotes
    if (req.user?.role === 'CUSTOMER') {
      whereClause.customerId = req.user.customerId || undefined;
    }

    const quotations = await prisma.quotation.findMany({
      where: whereClause,
      include: {
        customer: true,
        owner: { select: { id: true, name: true, email: true } },
        lines: { include: { product: true } },
        approvalRequests: { include: { steps: true }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(quotations);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/quotations - Create draft quotation
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { customerId, notes, validityDays } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Customer ID is required' } });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found' } });

    const quoteCount = await prisma.quotation.count();
    const quoteNumber = `Q-${1043 + quoteCount}`;

    const days = validityDays || 30;
    const validityDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const newQuote = await prisma.quotation.create({
      data: {
        quoteNumber,
        customerId,
        ownerId: req.user!.id,
        status: 'DRAFT',
        version: 1,
        validityDate,
        notes: notes || null,
        riskExplanation: JSON.stringify({
          worstLine: 'None',
          givenDiscount: 0,
          allowedDiscount: 0,
          overagePoints: 0,
          weightedRisk: 0,
          worstOveragePenalty: 0,
          riskScore: 0,
          riskBand: 'LOW',
          requiredApprovalChain: [],
        }),
      },
      include: { customer: true, owner: true, lines: true },
    });

    await logAudit({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      entityType: 'QUOTATION',
      entityId: newQuote.id,
      action: 'QUOTE_CREATED',
      afterState: { quoteNumber, customerName: customer.name },
      reason: 'Draft quotation initialized.',
    });

    return res.status(201).json(newQuote);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/quotations/:id - Get quotation detail
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const quote = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        owner: { select: { id: true, name: true, email: true } },
        lines: { include: { product: { include: { category: true } }, variant: true } },
        approvalRequests: { include: { steps: { include: { approver: true } } }, orderBy: { createdAt: 'desc' } },
        allocations: { include: { warehouse: true } },
        backorders: { include: { product: true } },
        subscriptions: true,
        invoices: { include: { payments: true } },
        negotiationThread: { include: { messages: true } },
        changeRequests: true,
        dealHealthAlerts: true,
      },
    });

    if (!quote) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });

    // Customer security check
    if (req.user?.role === 'CUSTOMER' && quote.customerId !== req.user.customerId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Unauthorized access to customer quotation' } });
    }

    return res.json(quote);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/quotations/:id/lines - Add line item
router.post('/:id/lines', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { productId, variantId, quantity, discountPercent } = req.body;
    const quoteId = req.params.id;

    const quote = await prisma.quotation.findUnique({
      where: { id: quoteId },
      include: { customer: true },
    });

    if (!quote) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });

    const pricing = await calculateLinePricing({
      productId,
      variantId,
      quantity: quantity || 1,
      discountPercent: discountPercent || 0.0,
      customerTier: quote.customer.tier,
    });

    const newLine = await prisma.quotationLine.create({
      data: {
        quotationId: quoteId,
        productId,
        variantId: variantId || null,
        quantity: pricing.quantity,
        unitPrice: pricing.unitPrice,
        discountPercent: pricing.discountPercent,
        effectiveCeiling: pricing.effectiveCeiling,
        overagePoints: pricing.overagePoints,
        status: pricing.status,
        netPrice: pricing.netPrice,
        taxAmount: pricing.taxAmount,
        totalAmount: pricing.totalAmount,
        costPrice: pricing.costPrice,
        marginAmount: pricing.marginAmount,
        marginPercent: pricing.marginPercent,
        isRecurring: pricing.isRecurring,
        billingCycle: pricing.isRecurring ? 'MONTHLY' : null,
      },
    });

    // Live recalculation
    const updatedQuote = await recalculateQuotation(quoteId);

    await logAudit({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      entityType: 'QUOTATION',
      entityId: quoteId,
      action: 'QUOTE_LINE_ADDED',
      afterState: { lineId: newLine.id, productId, quantity, discountPercent },
      reason: 'Product added to quote.',
    });

    return res.status(201).json(updatedQuote);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// PATCH /api/quotations/:id/lines/:lineId - Update line discount/quantity
router.patch('/:id/lines/:lineId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { quantity, discountPercent } = req.body;
    const { id: quoteId, lineId } = req.params;

    const line = await prisma.quotationLine.findUnique({ where: { id: lineId } });
    if (!line) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Line not found' } });

    const quote = await prisma.quotation.findUnique({
      where: { id: quoteId },
      include: { customer: true },
    });
    if (!quote) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });

    const pricing = await calculateLinePricing({
      productId: line.productId,
      variantId: line.variantId || undefined,
      quantity: quantity !== undefined ? quantity : line.quantity,
      discountPercent: discountPercent !== undefined ? discountPercent : line.discountPercent,
      customerTier: quote.customer.tier,
    });

    await prisma.quotationLine.update({
      where: { id: lineId },
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

    const updatedQuote = await recalculateQuotation(quoteId);

    await logAudit({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      entityType: 'QUOTATION',
      entityId: quoteId,
      action: 'DISCOUNT_CHANGED',
      afterState: { lineId, quantity: pricing.quantity, discountPercent: pricing.discountPercent, riskBand: updatedQuote.riskBand },
      reason: `Line pricing modified. Discount: ${pricing.discountPercent}%, Overage: ${pricing.overagePoints}pt.`,
    });

    return res.json(updatedQuote);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// DELETE /api/quotations/:id/lines/:lineId - Remove line
router.delete('/:id/lines/:lineId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id: quoteId, lineId } = req.params;

    await prisma.quotationLine.delete({ where: { id: lineId } });
    const updatedQuote = await recalculateQuotation(quoteId);

    await logAudit({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      entityType: 'QUOTATION',
      entityId: quoteId,
      action: 'QUOTE_LINE_REMOVED',
      reason: 'Line removed from quotation.',
    });

    return res.json(updatedQuote);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/quotations/:id/recalculate - Live manual recalculation
router.post('/:id/recalculate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const updatedQuote = await recalculateQuotation(req.params.id);
    return res.json(updatedQuote);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/quotations/:id/submit - Submit quote for approval
router.post('/:id/submit', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const quoteId = req.params.id;
    // First ensure fresh calculation
    await recalculateQuotation(quoteId);

    const result = await submitQuotationForApproval(
      quoteId,
      req.user!.id,
      req.user!.name,
      req.user!.role
    );

    const updatedQuote = await prisma.quotation.findUnique({
      where: { id: quoteId },
      include: {
        approvalRequests: { include: { steps: true }, orderBy: { createdAt: 'desc' } },
        customer: true,
        lines: { include: { product: true } },
      },
    });

    return res.json({ result, quotation: updatedQuote });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/quotations/:id/send - Send approved quote to customer
router.post('/:id/send', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const quote = await prisma.quotation.findUnique({ where: { id: req.params.id } });
    if (!quote) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });

    const updatedQuote = await prisma.quotation.update({
      where: { id: req.params.id },
      data: { status: 'SENT' },
    });

    await logAudit({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      entityType: 'QUOTATION',
      entityId: quote.id,
      action: 'QUOTE_SENT',
      reason: 'Quotation sent to customer for review.',
    });

    return res.json(updatedQuote);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
