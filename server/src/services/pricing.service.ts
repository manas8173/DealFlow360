import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LinePricingInput {
  productId: string;
  variantId?: string;
  quantity: number;
  discountPercent: number;
  customerTier: string; // BRONZE, SILVER, GOLD
}

export interface LinePricingResult {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  effectiveCeiling: number;
  overagePoints: number;
  status: string; // "OK" or "OVER (+Xpt)"
  grossPrice: number;
  discountAmount: number;
  netPrice: number;
  taxAmount: number;
  totalAmount: number;
  costPrice: number;
  marginAmount: number;
  marginPercent: number;
  isRecurring: boolean;
  unit: string;
}

/**
 * Calculates discount ceiling for a given customer tier and product category.
 * Formula: effective_discount_limit = MIN(customer_tier_limit, category_limit)
 */
export async function getEffectiveDiscountCeiling(customerTier: string, categoryId: string): Promise<number> {
  const tierRecord = await prisma.customerTier.findUnique({
    where: { tier: customerTier },
  });
  const categoryRecord = await prisma.productCategory.findUnique({
    where: { id: categoryId },
  });

  const tierLimit = tierRecord ? tierRecord.maxDiscountPercent : 10.0;
  const categoryLimit = categoryRecord ? categoryRecord.discountCeilingPercent : 10.0;

  return Math.min(tierLimit, categoryLimit);
}

/**
 * Evaluates line item pricing, discount overages, tax, margin, and cost.
 */
export async function calculateLinePricing(input: LinePricingInput): Promise<LinePricingResult> {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: { category: true, variants: true },
  });

  if (!product) {
    throw new Error(`Product not found: ${input.productId}`);
  }

  let unitPrice = product.basePrice;
  if (input.variantId) {
    const variant = product.variants.find((v) => v.id === input.variantId);
    if (variant) {
      unitPrice += variant.extraPrice;
    }
  }

  const effectiveCeiling = await getEffectiveDiscountCeiling(input.customerTier, product.categoryId);
  const discountPercent = Math.max(0, input.discountPercent);
  const overagePoints = Math.max(0, discountPercent - effectiveCeiling);

  const roundedOverage = Math.round(overagePoints * 100) / 100;
  const status = roundedOverage > 0 ? `OVER (+${roundedOverage}pt)` : 'OK';

  const grossPrice = Math.round(unitPrice * input.quantity * 100) / 100;
  const discountAmount = Math.round((grossPrice * discountPercent / 100) * 100) / 100;
  const netPrice = Math.round((grossPrice - discountAmount) * 100) / 100;

  const taxAmount = Math.round((netPrice * product.taxPercent / 100) * 100) / 100;
  const totalAmount = Math.round((netPrice + taxAmount) * 100) / 100;

  const totalCost = Math.round(product.costPrice * input.quantity * 100) / 100;
  const marginAmount = Math.round((netPrice - totalCost) * 100) / 100;
  const marginPercent = netPrice > 0 ? Math.round((marginAmount / netPrice * 100) * 100) / 100 : 0.0;

  return {
    productId: product.id,
    variantId: input.variantId,
    quantity: input.quantity,
    unitPrice,
    discountPercent,
    effectiveCeiling,
    overagePoints: roundedOverage,
    status,
    grossPrice,
    discountAmount,
    netPrice,
    taxAmount,
    totalAmount,
    costPrice: product.costPrice,
    marginAmount,
    marginPercent,
    isRecurring: product.isSubscriptionEligible,
    unit: product.unit,
  };
}
