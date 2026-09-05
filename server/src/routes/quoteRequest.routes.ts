import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.middleware';
import { Role } from '../lib/roles';
import { calculateLinePricing } from '../services/pricing.service';
import { recalculateQuotation } from './quotation.routes';

const router = Router();

function generateQuoteNumber(): string {
  return `Q-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

// GET /api/quote-requests - List quote requests for sales rep / managers / admin
router.get('/', authenticateToken, requireRoles([Role.SALES_REP, Role.SALES_MANAGER, Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const whereClause: any = {};
    if (req.user?.role === Role.SALES_REP) {
      whereClause.salesRepId = req.user.id;
    }

    const requests = await prisma.quoteRequest.findMany({
      where: whereClause,
      include: {
        customer: true,
        salesRep: { select: { id: true, name: true, email: true } },
        product: { include: { category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(requests);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/quote-requests/:id/accept - Consider and quote in a single click
router.post('/:id/accept', authenticateToken, requireRoles([Role.SALES_REP, Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.quoteRequest.findUnique({
      where: { id },
      include: { customer: true, product: true },
    });

    if (!request) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quote request not found' } });
    }

    if (req.user?.role === Role.SALES_REP && request.salesRepId !== req.user.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You are not assigned to this quote request' } });
    }

    // Create draft quotation
    const quoteNumber = generateQuoteNumber();
    const validityDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newQuote = await prisma.quotation.create({
      data: {
        quoteNumber,
        customerId: request.customerId,
        ownerId: req.user!.id,
        status: 'DRAFT',
        version: 1,
        validityDate,
        notes: request.notes ? `Customer Request: ${request.notes}` : 'Created from customer quote request',
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
    });

    // If a product was requested, add it to quotation lines
    if (request.productId && request.product) {
      const quantity = Math.max(1, request.quantity || 1);
      const pricing = await calculateLinePricing({
        productId: request.productId,
        quantity,
        discountPercent: 0,
        customerTier: request.customer.tier,
      });

      await prisma.quotationLine.create({
        data: {
          quotationId: newQuote.id,
          productId: request.productId,
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

      await recalculateQuotation(newQuote.id);
    }

    // Update quote request status to ACCEPTED
    await prisma.quoteRequest.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });

    return res.json({
      success: true,
      quoteId: newQuote.id,
      message: 'Quote created successfully from customer request',
    });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/quote-requests/:id/reject - Reject request
router.post('/:id/reject', authenticateToken, requireRoles([Role.SALES_REP, Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.quoteRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quote request not found' } });
    }

    if (req.user?.role === Role.SALES_REP && request.salesRepId !== req.user.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You are not assigned to this quote request' } });
    }

    const updated = await prisma.quoteRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    return res.json({
      success: true,
      request: updated,
      message: 'Quote request rejected',
    });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
