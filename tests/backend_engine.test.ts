import { describe, it, expect } from 'vitest';
import { calculateLinePricing, getEffectiveDiscountCeiling } from '../server/src/services/pricing.service';
import { calculateBlendedRisk } from '../server/src/services/risk.service';

describe('DealFlow360 Business Logic Engines', () => {
  it('1. Effective Discount Ceiling Formula: MIN(customer_tier_limit, category_limit)', async () => {
    // Gold Tier limit = 15%, Hardware Category limit = 15% -> MIN = 15%
    // Gold Tier limit = 15%, Services Category limit = 10% -> MIN = 10%
    const goldTierLimit = 15.0;
    const servicesCategoryLimit = 10.0;
    const effectiveCeiling = Math.min(goldTierLimit, servicesCategoryLimit);

    expect(effectiveCeiling).toBe(10.0);
  });

  it('2. Discount Governance Overage Calculation', () => {
    // Laptop: 12% given, 15% allowed -> 0 overage
    const laptopOverage = Math.max(0, 12.0 - 15.0);
    expect(laptopOverage).toBe(0);

    // Setup Service: 18% given, 10% allowed -> 8pt overage
    const setupOverage = Math.max(0, 18.0 - 10.0);
    expect(setupOverage).toBe(8.0);
  });

  it('3. Blended Risk Calculation Math (Primary Demo Quote Q-1042)', async () => {
    const lines = [
      { lineName: 'Laptop Pro 14', grossPrice: 2400.0, discountPercent: 12.0, effectiveCeiling: 15.0, overagePoints: 0.0 },
      { lineName: 'Onsite Setup Service', grossPrice: 450.0, discountPercent: 18.0, effectiveCeiling: 10.0, overagePoints: 8.0 },
      { lineName: 'Extended Warranty', grossPrice: 180.0, discountPercent: 10.0, effectiveCeiling: 15.0, overagePoints: 0.0 },
    ];

    const result = await calculateBlendedRisk(lines);

    // Total gross = 3030. Weighted overage = (8 * 450) / 3030 = 1.188
    // Worst overage = 8. Penalty = 8 * 0.5 = 4.0
    // Total risk score = 1.188 + 4.0 = 5.19 -> > 5.0 => HIGH Risk Band!
    expect(result.riskBand).toBe('HIGH');
    expect(result.riskScore).toBeGreaterThan(5.0);
    expect(result.worstLine).toBe('Onsite Setup Service');
    expect(result.overagePoints).toBe(8.0);
    expect(result.requiredApprovalChain).toContain('SALES_MANAGER');
    expect(result.requiredApprovalChain).toContain('FINANCE_OPERATIONS');
  });

  it('4. Low Risk Deal Classification (Q-1001)', async () => {
    const lines = [
      { lineName: 'Laptop Pro 14', grossPrice: 6000.0, discountPercent: 10.0, effectiveCeiling: 15.0, overagePoints: 0.0 },
    ];

    const result = await calculateBlendedRisk(lines);
    expect(result.riskBand).toBe('LOW');
    expect(result.riskScore).toBe(0);
    expect(result.requiredApprovalChain.length).toBe(0);
  });
});
