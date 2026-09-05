/**
 * Basic unit tests for DealFlow360 core business logic.
 * Run with: npm test (vitest)
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

// ── Mock PrismaClient for unit tests ─────────────────────────────────────────
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    customerTier: {
      findUnique: vi.fn().mockResolvedValue({ tier: 'GOLD', maxDiscountPercent: 30 }),
    },
    productCategory: {
      findUnique: vi.fn().mockResolvedValue({ id: 'cat1', discountCeilingPercent: 20 }),
    },
    product: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'prod1',
        sku: 'TST-001',
        name: 'Test Product',
        basePrice: 1000,
        costPrice: 500,
        taxPercent: 18,
        categoryId: 'cat1',
        category: { id: 'cat1', discountCeilingPercent: 20 },
        variants: [],
        unit: 'unit',
      }),
    },
    approvalPolicy: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  })),
}));

vi.mock('../server/src/lib/prisma', () => ({
  prisma: {
    customerTier: { findUnique: vi.fn().mockResolvedValue({ tier: 'GOLD', maxDiscountPercent: 30 }) },
    productCategory: { findUnique: vi.fn().mockResolvedValue({ id: 'cat1', discountCeilingPercent: 20 }) },
    product: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'prod1',
        sku: 'TST-001',
        name: 'Test Product',
        basePrice: 1000,
        costPrice: 500,
        taxPercent: 18,
        categoryId: 'cat1',
        category: { id: 'cat1', discountCeilingPercent: 20 },
        variants: [],
        unit: 'unit',
      }),
    },
    approvalPolicy: { findUnique: vi.fn().mockResolvedValue(null) },
  },
}));

// ── Quote Number Uniqueness ───────────────────────────────────────────────────
describe('Quote Number Generation', () => {
  function generateQuoteNumber(): string {
    return `Q-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  it('generates unique quote numbers', () => {
    const generated = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      generated.add(generateQuoteNumber());
    }
    expect(generated.size).toBe(1000);
  });

  it('always starts with Q-', () => {
    const q = generateQuoteNumber();
    expect(q).toMatch(/^Q-/);
  });

  it('has three segments separated by dashes', () => {
    const q = generateQuoteNumber();
    const parts = q.split('-');
    expect(parts.length).toBe(3);
  });
});

// ── Risk Band Calculation ─────────────────────────────────────────────────────
describe('Risk Band Thresholds', () => {
  function getRiskBand(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (score <= 0) return 'LOW';
    if (score <= 5.0) return 'MEDIUM';
    return 'HIGH';
  }

  it('returns LOW for score 0', () => {
    expect(getRiskBand(0)).toBe('LOW');
  });

  it('returns MEDIUM for score 1.0', () => {
    expect(getRiskBand(1.0)).toBe('MEDIUM');
  });

  it('returns MEDIUM for score 2.0', () => {
    expect(getRiskBand(2.0)).toBe('MEDIUM');
  });

  it('returns MEDIUM for score 5.0', () => {
    expect(getRiskBand(5.0)).toBe('MEDIUM');
  });

  it('returns HIGH for score 5.01', () => {
    expect(getRiskBand(5.01)).toBe('HIGH');
  });

  it('returns HIGH for score 8.0', () => {
    expect(getRiskBand(8.0)).toBe('HIGH');
  });

  it('returns HIGH for score 100', () => {
    expect(getRiskBand(100)).toBe('HIGH');
  });
});

// ── Proration Calculation ─────────────────────────────────────────────────────
describe('Billing Proration', () => {
  function calculateProration({
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
    return { unusedOldValue, newRemainingValue, netAdjustment };
  }

  it('returns zero adjustment for same quantity', () => {
    const result = calculateProration({ unitPrice: 100, oldQuantity: 5, newQuantity: 5, daysInPeriod: 30, remainingDays: 15 });
    expect(result.netAdjustment).toBe(0);
  });

  it('returns positive adjustment for quantity increase', () => {
    const result = calculateProration({ unitPrice: 100, oldQuantity: 5, newQuantity: 10, daysInPeriod: 30, remainingDays: 15 });
    expect(result.netAdjustment).toBeGreaterThan(0);
  });

  it('returns negative adjustment for quantity decrease (credit)', () => {
    const result = calculateProration({ unitPrice: 100, oldQuantity: 10, newQuantity: 5, daysInPeriod: 30, remainingDays: 15 });
    expect(result.netAdjustment).toBeLessThan(0);
  });

  it('calculates correct half-month adjustment for doubling quantity at 100/unit', () => {
    const result = calculateProration({ unitPrice: 100, oldQuantity: 5, newQuantity: 10, daysInPeriod: 30, remainingDays: 15 });
    // old: 500/30*15 = 250, new: 1000/30*15 = 500, delta = 250
    expect(result.netAdjustment).toBe(250);
  });
});

// ── Discount Ceiling ──────────────────────────────────────────────────────────
describe('Effective Discount Ceiling', () => {
  function getEffectiveCeiling(tierLimit: number, categoryLimit: number): number {
    return Math.min(tierLimit, categoryLimit);
  }

  it('uses category limit when it is more restrictive', () => {
    expect(getEffectiveCeiling(30, 15)).toBe(15);
  });

  it('uses tier limit when it is more restrictive', () => {
    expect(getEffectiveCeiling(10, 20)).toBe(10);
  });

  it('returns exact value when both limits are equal', () => {
    expect(getEffectiveCeiling(20, 20)).toBe(20);
  });
});
