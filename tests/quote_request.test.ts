import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../server/src/lib/prisma';
import request from 'supertest';
import app from '../server/src/app';
import { generateToken } from '../server/src/middleware/auth.middleware';

describe('Customer Quote Requests Feature (E2E API Test)', () => {
  let customerToken: string;
  let repToken: string;
  let testCustomer: any;
  let testSalesRep: any;
  let testProduct: any;
  let createdRequestId: string;

  beforeAll(async () => {
    // Find or seed a sales rep
    testSalesRep = await prisma.user.findFirst({
      where: { role: 'SALES_REP' },
    });
    if (!testSalesRep) {
      testSalesRep = await prisma.user.create({
        data: {
          name: 'Test Sales Rep',
          email: `salesrep-${Date.now()}@example.com`,
          passwordHash: 'dummyhash',
          role: 'SALES_REP',
          status: 'ACTIVE',
        },
      });
    }

    // Find or seed a customer
    testCustomer = await prisma.customer.findFirst();
    if (!testCustomer) {
      testCustomer = await prisma.customer.create({
        data: {
          name: 'Acme Test Customer',
          email: `acme-${Date.now()}@example.com`,
          company: 'Acme Corp',
          tier: 'GOLD',
        },
      });
    }

    // Customer user
    let customerUser = await prisma.user.findFirst({
      where: { customerId: testCustomer.id },
    });
    if (!customerUser) {
      customerUser = await prisma.user.create({
        data: {
          name: 'Acme User',
          email: `acmeuser-${Date.now()}@example.com`,
          passwordHash: 'dummyhash',
          role: 'CUSTOMER',
          status: 'ACTIVE',
          customerId: testCustomer.id,
        },
      });
    }

    // Find or seed a product
    testProduct = await prisma.product.findFirst();

    // Create JWTs using generateToken helper
    customerToken = generateToken({
      id: customerUser.id,
      email: customerUser.email,
      name: customerUser.name,
      role: customerUser.role,
      customerId: testCustomer.id,
    });

    repToken = generateToken({
      id: testSalesRep.id,
      email: testSalesRep.email,
      name: testSalesRep.name,
      role: testSalesRep.role,
    });
  });

  it('1. Customer can fetch list of sales representatives', async () => {
    const res = await request(app)
      .get('/api/portal/sales-reps')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.some((rep: any) => rep.id === testSalesRep.id)).toBe(true);
  });

  it('2. Customer can submit a quote request choosing product and sales representative', async () => {
    const res = await request(app)
      .post('/api/portal/quote-requests')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        salesRepId: testSalesRep.id,
        productId: testProduct?.id,
        quantity: 5,
        notes: 'Requesting volume quotation for upcoming team deployment',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('PENDING');
    expect(res.body.salesRepId).toBe(testSalesRep.id);
    expect(res.body.customerId).toBe(testCustomer.id);
    expect(res.body.quantity).toBe(5);

    createdRequestId = res.body.id;
  });

  it('3. Customer can view their submitted quote requests', async () => {
    const res = await request(app)
      .get('/api/portal/quote-requests')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((r: any) => r.id === createdRequestId);
    expect(found).toBeDefined();
    expect(found.status).toBe('PENDING');
    expect(found.salesRep.name).toBe(testSalesRep.name);
  });

  it('4. Sales Representative sees the incoming quote request in /api/quote-requests', async () => {
    const res = await request(app)
      .get('/api/quote-requests')
      .set('Authorization', `Bearer ${repToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((r: any) => r.id === createdRequestId);
    expect(found).toBeDefined();
    expect(found.status).toBe('PENDING');
    expect(found.customer.id).toBe(testCustomer.id);
  });

  it('5. Sales Representative considers the request: creates a quote in a single click', async () => {
    const res = await request(app)
      .post(`/api/quote-requests/${createdRequestId}/accept`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.quoteId).toBeDefined();

    const quoteId = res.body.quoteId;

    // Verify quote was created and has draft status
    const quote = await prisma.quotation.findUnique({
      where: { id: quoteId },
      include: { lines: true, customer: true, owner: true },
    });

    expect(quote).toBeDefined();
    expect(quote?.status).toBe('DRAFT');
    expect(quote?.customerId).toBe(testCustomer.id);
    expect(quote?.ownerId).toBe(testSalesRep.id);

    // If product was attached, line was added
    if (testProduct) {
      expect(quote?.lines.length).toBeGreaterThan(0);
      expect(quote?.lines[0].productId).toBe(testProduct.id);
      expect(quote?.lines[0].quantity).toBe(5);
    }

    // Verify quote request status is updated to ACCEPTED
    const reqDb = await prisma.quoteRequest.findUnique({
      where: { id: createdRequestId },
    });
    expect(reqDb?.status).toBe('ACCEPTED');
  });

  it('6. Sales Representative can reject a quote request', async () => {
    // Create another request to test rejection
    const newReq = await prisma.quoteRequest.create({
      data: {
        customerId: testCustomer.id,
        salesRepId: testSalesRep.id,
        notes: 'Another test inquiry to reject',
        status: 'PENDING',
      },
    });

    const res = await request(app)
      .post(`/api/quote-requests/${newReq.id}/reject`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await prisma.quoteRequest.findUnique({
      where: { id: newReq.id },
    });
    expect(updated?.status).toBe('REJECTED');
  });
});
