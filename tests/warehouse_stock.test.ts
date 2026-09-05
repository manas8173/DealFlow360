import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../server/src/lib/prisma';
import request from 'supertest';
import app from '../server/src/app';
import { generateToken } from '../server/src/middleware/auth.middleware';

describe('Warehouse Stock & Inventory API Test', () => {
  let repToken: string;
  let customerToken: string;

  beforeAll(async () => {
    const repUser = await prisma.user.findFirst({
      where: { role: 'SALES_REP' },
    });
    expect(repUser).toBeTruthy();
    repToken = generateToken(repUser!);

    const custUser = await prisma.user.findFirst({
      where: { role: 'CUSTOMER' },
    });
    if (custUser) {
      customerToken = generateToken(custUser);
    }
  });

  it('GET /api/fulfillment/inventory - allows SALES_REP to view real-time stock across warehouses', async () => {
    const res = await request(app)
      .get('/api/fulfillment/inventory')
      .set('Authorization', `Bearer ${repToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('warehouses');
    expect(res.body).toHaveProperty('products');
    expect(res.body).toHaveProperty('stats');

    expect(Array.isArray(res.body.warehouses)).toBe(true);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.stats.totalWarehouses).toBeGreaterThanOrEqual(1);
    expect(res.body.stats.totalSKUs).toBeGreaterThanOrEqual(1);

    // Verify each product has computed stock fields
    const firstProduct = res.body.products[0];
    expect(firstProduct).toHaveProperty('totalOnHand');
    expect(firstProduct).toHaveProperty('totalReserved');
    expect(firstProduct).toHaveProperty('totalAvailable');
    expect(firstProduct).toHaveProperty('status');
    expect(firstProduct).toHaveProperty('warehouseBreakdown');
  });

  it('GET /api/fulfillment/inventory - rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/fulfillment/inventory');
    expect(res.status).toBe(401);
  });

  it('GET /api/fulfillment/inventory - rejects external CUSTOMER role from seeing internal warehouse stock', async () => {
    if (!customerToken) return;
    const res = await request(app)
      .get('/api/fulfillment/inventory')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });
});
