import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { getRecommendationsForQuotation } from '../services/recommendation.service';
import { calculateLinePricing } from '../services/pricing.service';
import { recalculateQuotation } from './quotation.routes';
import { PrismaClient } from '@prisma/client';
import { logAudit } from '../services/audit.service';

const router = Router();
const prisma = new PrismaClient();

// GET /api/quotations/:id/recommendations
router.get('/quotations/:id/recommendations', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const recommendations = await getRecommendationsForQuotation(req.params.id);
    return res.json(recommendations);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/quotations/:id/recommendations/:productId/add - One-click add recommended product to quote
router.post('/quotations/:id/recommendations/:productId/add', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id: quoteId, productId } = req.params;
    const { promotionDiscountPercent } = req.body;

    const quote = await prisma.quotation.findUnique({
      where: { id: quoteId },
      include: { customer: true },
    });
    if (!quote) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });

    const discountToUse = promotionDiscountPercent !== undefined ? promotionDiscountPercent : 0.0;

    const pricing = await calculateLinePricing({
      productId,
      quantity: 1,
      discountPercent: discountToUse,
      customerTier: quote.customer.tier,
    });

    const newLine = await prisma.quotationLine.create({
      data: {
        quotationId: quoteId,
        productId,
        quantity: 1,
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

    const updatedQuote = await recalculateQuotation(quoteId);

    await logAudit({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      entityType: 'QUOTATION',
      entityId: quoteId,
      action: 'UPSELL_RECOMMENDATION_ADDED',
      afterState: { lineId: newLine.id, productId, marginDelta: pricing.marginAmount },
      reason: 'Accepted upsell/cross-sell recommendation and added to quotation.',
    });

    return res.json(updatedQuote);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
