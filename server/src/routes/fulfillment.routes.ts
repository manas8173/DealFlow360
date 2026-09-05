import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.middleware';
import { recommendFulfillment, acceptFulfillmentAllocation, overrideFulfillmentAllocation } from '../services/fulfillment.service';

const router = Router();
const prisma = new PrismaClient();

// GET /api/fulfillment - List orders needing fulfillment
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const orders = await prisma.quotation.findMany({
      where: {
        status: { in: ['APPROVED', 'CONFIRMED', 'FULFILLING', 'COMPLETED'] },
      },
      include: {
        customer: true,
        lines: { include: { product: true } },
        allocations: { include: { warehouse: true } },
        backorders: { include: { product: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json(orders);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/fulfillment/:orderId/recommend - Get warehouse split recommendation
router.get('/:orderId/recommend', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const recommendations = await recommendFulfillment(req.params.orderId);
    return res.json(recommendations);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/fulfillment/:orderId/accept - Accept split recommendation
router.post('/:orderId/accept', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await acceptFulfillmentAllocation(
      req.params.orderId,
      req.user!.id,
      req.user!.name,
      req.user!.role
    );
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/fulfillment/:orderId/override - Manual override by Finance Operations or Admin
router.post('/:orderId/override', authenticateToken, requireRoles(['FINANCE_OPERATIONS', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { lineId, warehouseId, allocatedQty, reason } = req.body;

    const allocation = await overrideFulfillmentAllocation({
      quoteId: req.params.orderId,
      lineId,
      warehouseId,
      allocatedQty,
      reason,
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
    });

    return res.json(allocation);
  } catch (error: any) {
    return res.status(400).json({ error: { code: 'FULFILLMENT_ERROR', message: error.message } });
  }
});

export default router;
