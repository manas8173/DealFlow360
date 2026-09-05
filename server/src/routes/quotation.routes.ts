import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.middleware';
import { calculateLinePricing } from '../services/pricing.service';
import { calculateBlendedRisk } from '../services/risk.service';
import { submitQuotationForApproval } from '../services/approval.service';
import { logAudit } from '../services/audit.service';
import { Role } from '../lib/roles';

const router = Router();

// ── Zod validation schemas ────────────────────────────────────────────────────
const AddLineSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1, 'quantity must be at least 1'),
  discountPercent: z.number().min(0).max(100).default(0),
});

const UpdateLineSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
});

// ── Helper: generate unique quote number (atomic, no count race) ──────────────
function generateQuoteNumber(): string {
  return `Q-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

// ── Helper: recalculate whole quotation totals and risk score ─────────────────
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
  const lineUpdates: Promise<any>[] = [];

  for (const line of quote.lines) {
    const updatedLinePricing = await calculateLinePricing({
      productId: line.productId,
      variantId: line.variantId || undefined,
      quantity: line.quantity,
      discountPercent: line.discountPercent,
      customerTier: quote.customer.tier,
    });

    // Batch line updates via Promise array — reduces sequential await overhead
    lineUpdates.push(
      prisma.quotationLine.update({
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
      })
    );

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

  // Execute all line updates in parallel
  await Promise.all(lineUpdates);

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
      lines: {
        include: {
          product: {
            include: {
              category: true,
              inventoryItems: { include: { warehouse: true } },
            },
          },
          variant: true,
        },
      },
    },
  });

  return updatedQuote;
}

// GET /api/quotations - List quotations with optional filters
// FIX: SALES_REP only sees their own quotes (ownership filter)
router.get('/', authenticateToken, requireRoles([Role.SALES_REP, Role.SALES_MANAGER, Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const { status, customerId } = req.query;
    const whereClause: any = {};

    if (status) whereClause.status = status as string;
    if (customerId) whereClause.customerId = customerId as string;

    // SALES_REP: filter to own quotes only
    if (req.user?.role === Role.SALES_REP) {
      whereClause.ownerId = req.user.id;
    }

    // CUSTOMER: filter to their own customer's quotes
    if (req.user?.role === Role.CUSTOMER) {
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
router.post('/', authenticateToken, requireRoles([Role.SALES_REP, Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const { customerId, notes, validityDays, initialItem } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Customer ID is required' } });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found' } });

    // FIX: Atomic quote number — no count query, no race condition
    const quoteNumber = generateQuoteNumber();

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

    if (initialItem && initialItem.productId) {
      const pricing = await calculateLinePricing({
        productId: initialItem.productId,
        quantity: Math.max(1, Number(initialItem.quantity) || 1),
        discountPercent: Math.min(100, Math.max(0, Number(initialItem.discountPercent) || 0)),
        customerTier: customer.tier,
      });

      await prisma.quotationLine.create({
        data: {
          quotationId: newQuote.id,
          productId: initialItem.productId,
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
        },
      });

      const recalculated = await recalculateQuotation(newQuote.id);

      await logAudit({
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        entityType: 'QUOTATION',
        entityId: newQuote.id,
        action: 'QUOTE_CREATED',
        afterState: { quoteNumber, customerName: customer.name, manualDiscount: pricing.discountPercent },
        reason: `Draft quotation created with manual discount of ${pricing.discountPercent}%.`,
      });

      return res.status(201).json(recalculated);
    }

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
// FIX: SALES_REP ownership check added
router.get('/:id', authenticateToken, requireRoles([Role.SALES_REP, Role.SALES_MANAGER, Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const quote = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        owner: { select: { id: true, name: true, email: true } },
        lines: { include: { product: { include: { category: true, inventoryItems: { include: { warehouse: true } } } }, variant: true } },
        approvalRequests: { include: { steps: { include: { approver: true } } }, orderBy: { createdAt: 'desc' } },
        allocations: { include: { warehouse: true } },
        backorders: { include: { product: true } },
        invoices: { include: { payments: true } },
        negotiationThread: { include: { messages: true } },
        changeRequests: true,
        dealHealthAlerts: true,
      },
    });

    if (!quote) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });

    // SALES_REP: can only view their own quotes
    if (req.user?.role === Role.SALES_REP && quote.ownerId !== req.user.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only view your own quotations' } });
    }

    // Customer security check
    if (req.user?.role === Role.CUSTOMER && quote.customerId !== req.user.customerId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Unauthorized access to customer quotation' } });
    }

    return res.json(quote);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/quotations/:id/lines - Add line item
router.post('/:id/lines', authenticateToken, requireRoles([Role.SALES_REP, Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const parseResult = AddLineSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message } });
    }
    const { productId, variantId, quantity, discountPercent } = parseResult.data;
    const quoteId = req.params.id;

    const quote = await prisma.quotation.findUnique({
      where: { id: quoteId },
      include: { customer: true },
    });

    if (!quote) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });

    const pricing = await calculateLinePricing({
      productId,
      variantId,
      quantity,
      discountPercent,
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
      },
    });

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
router.patch('/:id/lines/:lineId', authenticateToken, requireRoles([Role.SALES_REP, Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const parseResult = UpdateLineSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message } });
    }
    const { quantity, discountPercent } = parseResult.data;
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
router.delete('/:id/lines/:lineId', authenticateToken, requireRoles([Role.SALES_REP, Role.ADMIN]), async (req: AuthRequest, res) => {
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
router.post('/:id/recalculate', authenticateToken, requireRoles([Role.SALES_REP, Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const updatedQuote = await recalculateQuotation(req.params.id);
    return res.json(updatedQuote);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/quotations/:id/submit - Submit quote for approval
router.post('/:id/submit', authenticateToken, requireRoles([Role.SALES_REP, Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const quoteId = req.params.id;
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
// FIX: Status guard — only APPROVED quotes can be sent
router.post('/:id/send', authenticateToken, requireRoles([Role.SALES_REP, Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const quote = await prisma.quotation.findUnique({ where: { id: req.params.id } });
    if (!quote) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });

    if (quote.status !== 'APPROVED') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: `Cannot send quotation in status '${quote.status}'. Only APPROVED quotations can be sent to customers.`,
        },
      });
    }

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
