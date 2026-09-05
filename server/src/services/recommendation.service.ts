import { prisma } from '../lib/prisma';
import { calculateLinePricing } from './pricing.service';
import { logAudit } from './audit.service';

export interface EnrichedRecommendation {
  id: string;
  sourceProductId: string;
  targetProduct: {
    id: string;
    sku: string;
    name: string;
    description?: string | null;
    basePrice: number;
    costPrice: number;
    unit: string;
  };
  ruleType: string; // UPSELL, CROSS_SELL, COMPLEMENTARY
  marginDelta: number;
  promotionDiscountPercent: number;
  description?: string | null;
  liveImpact: {
    unitPrice: number;
    discountPercent: number;
    netAmount: number;
    marginAmount: number;
    marginPercent: number;
  };
}

/**
 * Calculates upsell/cross-sell recommendations for a quotation based on its current line items.
 */
export async function getRecommendationsForQuotation(quoteId: string): Promise<EnrichedRecommendation[]> {
  const quote = await prisma.quotation.findUnique({
    where: { id: quoteId },
    include: {
      customer: true,
      lines: { select: { productId: true } },
    },
  });

  if (!quote) throw new Error('Quotation not found');

  const currentProductIds = new Set(quote.lines.map((l) => l.productId));

  const rules = await prisma.recommendationRule.findMany({
    where: {
      sourceProductId: { in: Array.from(currentProductIds) },
      targetProductId: { notIn: Array.from(currentProductIds) },
    },
    include: {
      targetProduct: true,
    },
  });

  const enriched: EnrichedRecommendation[] = [];

  for (const rule of rules) {
    const target = rule.targetProduct;
    const discountToApply = rule.promotionDiscountPercent > 0 ? rule.promotionDiscountPercent : 0.0;

    const linePricing = await calculateLinePricing({
      productId: target.id,
      quantity: 1,
      discountPercent: discountToApply,
      customerTier: quote.customer.tier,
    });

    enriched.push({
      id: rule.id,
      sourceProductId: rule.sourceProductId,
      targetProduct: {
        id: target.id,
        sku: target.sku,
        name: target.name,
        description: target.description,
        basePrice: target.basePrice,
        costPrice: target.costPrice,
        unit: target.unit,
      },
      ruleType: rule.ruleType,
      marginDelta: rule.marginDelta,
      promotionDiscountPercent: rule.promotionDiscountPercent,
      description: rule.description,
      liveImpact: {
        unitPrice: linePricing.unitPrice,
        discountPercent: linePricing.discountPercent,
        netAmount: linePricing.netPrice,
        marginAmount: linePricing.marginAmount,
        marginPercent: linePricing.marginPercent,
      },
    });
  }

  return enriched;
}
