import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { recordPayment, calculateProration } from '../services/billing.service';

const router = Router();
const prisma = new PrismaClient();

// GET /api/subscriptions
router.get('/subscriptions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        customer: true,
        product: true,
        billingSchedules: { orderBy: { invoiceDate: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(subscriptions);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/invoices
router.get('/invoices', authenticateToken, async (req: AuthRequest, res) => {
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
router.get('/invoices/:id', authenticateToken, async (req: AuthRequest, res) => {
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
router.post('/invoices/:id/payment', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { amount, paymentMethod, reference, notes } = req.body;

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

// POST /api/subscriptions/:id/modify - Modify subscription & calculate proration
router.post('/subscriptions/:id/modify', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { newQuantity } = req.body;
    const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });

    if (!sub) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Subscription not found' } });

    const proration = calculateProration({
      unitPrice: sub.unitPrice,
      oldQuantity: sub.quantity,
      newQuantity: newQuantity || sub.quantity,
      daysInPeriod: 30,
      remainingDays: 15,
    });

    const updatedSub = await prisma.subscription.update({
      where: { id: req.params.id },
      data: {
        quantity: newQuantity || sub.quantity,
        status: 'MODIFIED',
      },
    });

    return res.json({ subscription: updatedSub, proration });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
