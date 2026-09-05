import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../server/src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('DealFlow360 Target Hackathon E2E Demo Flow', () => {
  let repToken: string;
  let managerToken: string;
  let financeToken: string;
  let customerToken: string;
  let q1042Id: string;
  let approvalRequestId: string;
  let changeRequestId: string;

  beforeAll(async () => {
    // 1. Authenticate Demo Users
    const repRes = await request(app).post('/api/auth/login').send({ email: 'rep@dealflow360.demo', password: 'Password123!' });
    repToken = repRes.body.token;

    const mgrRes = await request(app).post('/api/auth/login').send({ email: 'manager@dealflow360.demo', password: 'Password123!' });
    managerToken = mgrRes.body.token;

    const finRes = await request(app).post('/api/auth/login').send({ email: 'finance@dealflow360.demo', password: 'Password123!' });
    financeToken = finRes.body.token;

    const custRes = await request(app).post('/api/auth/login').send({ email: 'customer@acme.demo', password: 'Password123!' });
    customerToken = custRes.body.token;

    // Get Q-1042 ID from DB
    const q1042 = await prisma.quotation.findUnique({ where: { quoteNumber: 'Q-1042' } });
    if (q1042) q1042Id = q1042.id;
  });

  it('Step 1: Open Q-1042 and verify discount governance calculations', async () => {
    const res = await request(app)
      .get(`/api/quotations/${q1042Id}`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(res.status).toBe(200);
    const quote = res.body;

    expect(quote.quoteNumber).toBe('Q-1042');
    expect(quote.customer.tier).toBe('GOLD');

    // Laptop line 12% disc <= 15% Gold/Hardware ceiling -> OK
    const laptopLine = quote.lines.find((l: any) => l.product.sku === 'LP-14-01');
    expect(laptopLine.status).toBe('OK');
    expect(laptopLine.overagePoints).toBe(0);

    // Setup Service line 18% disc > 10% Services ceiling -> OVER (+8pt)
    const setupLine = quote.lines.find((l: any) => l.product.sku === 'SRV-SETUP-01');
    expect(setupLine.status).toBe('OVER (+8pt)');
    expect(setupLine.overagePoints).toBe(8.0);

    // Calculated Risk Score > 5 -> HIGH Risk Band
    expect(quote.riskBand).toBe('HIGH');
    expect(quote.riskScore).toBeGreaterThan(5.0);
  });

  it('Step 2: Submit Q-1042 for approval and verify multi-step routing', async () => {
    const res = await request(app)
      .post(`/api/quotations/${q1042Id}/submit`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(res.status).toBe(200);
    const result = res.body.result;

    expect(result.status).toBe('PENDING_APPROVAL');
    expect(result.approvalRequest).toBeDefined();

    approvalRequestId = result.approvalRequest.id;
    const steps = result.approvalRequest.steps;
    expect(steps.length).toBe(2);
    expect(steps[0].roleRequired).toBe('SALES_MANAGER');
    expect(steps[1].roleRequired).toBe('FINANCE_OPERATIONS');
  });

  it('Step 3: Sales Manager reviews risk explanation and approves step 1', async () => {
    const res = await request(app)
      .post(`/api/approvals/${approvalRequestId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ comment: 'Approved setup discount overage for Acme Corp HQ expansion.' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PENDING_NEXT_STEP');
  });

  it('Step 4: Finance Operations approves step 2 -> Quote becomes APPROVED', async () => {
    const res = await request(app)
      .post(`/api/approvals/${approvalRequestId}/approve`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ comment: 'Finance approval granted.' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('APPROVED');

    // Verify Quote status in DB is APPROVED
    const q = await prisma.quotation.findUnique({ where: { id: q1042Id } });
    expect(q?.status).toBe('APPROVED');
  });

  it('Step 5: Accept Upsell recommendation (Wireless Mouse) -> Totals & Margins update', async () => {
    // Get mouse product ID
    const mouse = await prisma.product.findUnique({ where: { sku: 'ACC-MSE-01' } });

    const res = await request(app)
      .post(`/api/quotations/${q1042Id}/recommendations/${mouse?.id}/add`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(res.status).toBe(200);
    const updatedQuote = res.body;

    expect(updatedQuote.lines.some((l: any) => l.productId === mouse?.id)).toBe(true);
    expect(updatedQuote.totalMargin).toBeGreaterThan(663.0);
  });

  it('Step 6: Accept Multi-Warehouse fulfillment split', async () => {
    const res = await request(app)
      .post(`/api/fulfillment/${q1042Id}/accept`)
      .set('Authorization', `Bearer ${financeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('FULFILLING');
  });

  it('Step 7: Customer counter-discounts via Customer Portal', async () => {
    const setupLine = await prisma.quotationLine.findFirst({
      where: { quotationId: q1042Id, product: { sku: 'SRV-SETUP-01' } },
    });

    const res = await request(app)
      .post(`/api/portal/quotations/${q1042Id}/change-requests`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        lineId: setupLine?.id,
        requestedDiscountPercent: 22.0,
        notes: 'Requesting 22% discount on setup service.',
      });

    expect(res.status).toBe(201);
    changeRequestId = res.body.id;
  });

  it('Step 8: Internal user accepts counter discount -> AUTOMATIC RE-APPROVAL TRIGGERED', async () => {
    const res = await request(app)
      .post(`/api/portal/change-requests/${changeRequestId}/accept`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reApprovalTriggered).toBe(true);
    expect(res.body.quotation.status).toBe('PENDING_APPROVAL');
    expect(res.body.quotation.version).toBe(2);

    // Get new approval request
    const newApproval = res.body.approvalRequest;
    approvalRequestId = newApproval.id;
  });

  it('Step 9: Re-approve quote -> Customer confirms -> Order confirmed', async () => {
    // Re-approve Manager & Finance
    await request(app).post(`/api/approvals/${approvalRequestId}/approve`).set('Authorization', `Bearer ${managerToken}`).send({ comment: 'Re-approved manager' });
    await request(app).post(`/api/approvals/${approvalRequestId}/approve`).set('Authorization', `Bearer ${financeToken}`).send({ comment: 'Re-approved finance' });

    // Customer confirms
    const res = await request(app)
      .post(`/api/portal/quotations/${q1042Id}/confirm`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CONFIRMED');
  });

  it('Step 10: Record payment on generated invoice -> Invoice becomes PAID', async () => {
    const invoice = await prisma.invoice.findFirst({ where: { quotationId: q1042Id } });
    expect(invoice).toBeDefined();

    const res = await request(app)
      .post(`/api/invoices/${invoice?.id}/payment`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        amount: invoice?.balanceAmount,
        paymentMethod: 'CREDIT_CARD',
        reference: 'REF-CONFIRMED-PAYMENT',
      });

    expect(res.status).toBe(200);
    expect(res.body.invoice.status).toBe('PAID');
    expect(res.body.invoice.balanceAmount).toBe(0);
  });
});
