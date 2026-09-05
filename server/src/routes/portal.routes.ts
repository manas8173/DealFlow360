import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest, verifyCustomerIsolation } from '../middleware/auth.middleware';
import { createCustomerChangeRequest, acceptCustomerChangeRequest, confirmQuotationByCustomer } from '../services/portal.service';

const router = Router();
const prisma = new PrismaClient();

// GET /api/portal/quotations - List customer's own quotations ONLY
router.get('/quotations', authenticateToken, verifyCustomerIsolation, async (req: AuthRequest, res) => {
  try {
    const customerId = req.user?.role === 'CUSTOMER' ? req.user.customerId : (req.query.customerId as string);

    if (!customerId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Customer ID is required' } });
    }

    const quotations = await prisma.quotation.findMany({
      where: { customerId },
      include: {
        customer: true,
        lines: { include: { product: true } },
        changeRequests: true,
        negotiationThread: { include: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(quotations);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/portal/quotations/:id - Customer quote detail with strict isolation
router.get('/quotations/:id', authenticateToken, verifyCustomerIsolation, async (req: AuthRequest, res) => {
  try {
    const quote = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        lines: { include: { product: true } },
        changeRequests: true,
        negotiationThread: { include: { messages: true } },
      },
    });

    if (!quote) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });

    // Strict customer isolation check
    if (req.user?.role === 'CUSTOMER' && quote.customerId !== req.user.customerId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden: Cannot access quotation belonging to another customer.' } });
    }

    // Strip internal risk breakdown details before returning to customer!
    const sanitizedQuote = {
      ...quote,
      riskScore: undefined,
      riskBand: undefined,
      riskExplanation: undefined,
    };

    return res.json(sanitizedQuote);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/portal/quotations/:id/change-requests - Customer submits counter discount or change request
router.post('/quotations/:id/change-requests', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { lineId, requestedDiscountPercent, requestedQuantity, notes } = req.body;
    const customerId = req.user?.role === 'CUSTOMER' ? req.user.customerId! : req.body.customerId;

    if (!customerId) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Customer ID required' } });

    const changeReq = await createCustomerChangeRequest({
      quotationId: req.params.id,
      customerId,
      lineId,
      requestedDiscountPercent,
      requestedQuantity,
      notes,
    });

    return res.status(201).json(changeReq);
  } catch (error: any) {
    return res.status(400).json({ error: { code: 'PORTAL_ERROR', message: error.message } });
  }
});

// POST /api/portal/change-requests/:changeRequestId/accept - Internal user accepts change request (triggers re-approval if threshold exceeded)
router.post('/change-requests/:changeRequestId/accept', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await acceptCustomerChangeRequest({
      changeRequestId: req.params.changeRequestId,
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: { code: 'ACCEPTANCE_ERROR', message: error.message } });
  }
});

// POST /api/portal/quotations/:id/confirm - Customer confirms quotation
router.post('/quotations/:id/confirm', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const customerId = req.user?.role === 'CUSTOMER' ? req.user.customerId! : req.body.customerId;
    const confirmedQuote = await confirmQuotationByCustomer(req.params.id, customerId);
    return res.json(confirmedQuote);
  } catch (error: any) {
    return res.status(400).json({ error: { code: 'CONFIRMATION_ERROR', message: error.message } });
  }
});

export default router;
