import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.middleware';
import { recordPayment } from '../services/billing.service';

const router = Router();

const PaymentSchema = z.object({
  amount: z.number().positive('amount must be greater than zero'),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/invoices
router.get('/invoices', authenticateToken, requireRoles(['SALES_REP', 'FINANCE_OPERATIONS', 'ADMIN', 'CUSTOMER']), async (req: AuthRequest, res) => {
  try {
    const whereClause: any = {};
    if (req.user?.role === 'CUSTOMER') {
      whereClause.customerId = req.user.customerId || undefined;
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: true,
        lines: true,
        payments: { orderBy: { paymentDate: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(invoices);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/invoices/:id
router.get('/invoices/:id', authenticateToken, requireRoles(['FINANCE_OPERATIONS', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        lines: true,
        payments: true,
        quotation: true,
      },
    });

    if (!invoice) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    if (req.user?.role === 'CUSTOMER' && invoice.customerId !== req.user.customerId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Unauthorized invoice access' } });
    }

    return res.json(invoice);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/invoices/:id/payment - Record payment
router.post('/invoices/:id/payment', authenticateToken, requireRoles(['FINANCE_OPERATIONS', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const parseResult = PaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message } });
    }
    const { amount, paymentMethod, reference, notes } = parseResult.data;

    const result = await recordPayment({
      invoiceId: req.params.id,
      amount,
      paymentMethod: paymentMethod || 'CREDIT_CARD',
      reference: reference || `REF-${Date.now()}`,
      notes,
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: { code: 'PAYMENT_ERROR', message: error.message } });
  }
});

export default router;
