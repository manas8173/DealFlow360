import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.middleware';
import { recommendFulfillment, acceptFulfillmentAllocation, overrideFulfillmentAllocation } from '../services/fulfillment.service';

import { INTERNAL_ROLES } from '../lib/roles';

const router = Router();

const OverrideSchema = z.object({
  lineId: z.string().min(1, 'lineId is required'),
  warehouseId: z.string().min(1, 'warehouseId is required'),
  allocatedQty: z.number().int().min(1, 'allocatedQty must be at least 1'),
  reason: z.string().min(1, 'reason is required'),
});

// GET /api/fulfillment/inventory - Real-time stock across all warehouses (Internal employees)
router.get('/inventory', authenticateToken, requireRoles(INTERNAL_ROLES), async (req: AuthRequest, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        inventoryItems: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const products = await prisma.product.findMany({
      include: {
        category: true,
        inventoryItems: {
          include: { warehouse: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    let totalOnHand = 0;
    let totalReserved = 0;

    const enrichedProducts = products.map((p) => {
      const pOnHand = p.inventoryItems.reduce((sum, item) => sum + item.onHandQty, 0);
      const pReserved = p.inventoryItems.reduce((sum, item) => sum + item.reservedQty, 0);
      const pAvailable = Math.max(0, pOnHand - pReserved);

      totalOnHand += pOnHand;
      totalReserved += pReserved;

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        basePrice: p.basePrice,
        unit: p.unit,
        category: p.category,
        totalOnHand: pOnHand,
        totalReserved: pReserved,
        totalAvailable: pAvailable,
        status: pAvailable <= 0 ? 'OUT_OF_STOCK' : pAvailable < 10 ? 'LOW_STOCK' : 'IN_STOCK',
        warehouseBreakdown: p.inventoryItems.map((item) => ({
          warehouseId: item.warehouse.id,
          warehouseName: item.warehouse.name,
          warehouseCode: item.warehouse.code,
          location: item.warehouse.location,
          onHandQty: item.onHandQty,
          reservedQty: item.reservedQty,
          availableQty: Math.max(0, item.onHandQty - item.reservedQty),
        })),
      };
    });

    const totalAvailable = Math.max(0, totalOnHand - totalReserved);
    const lowStockCount = enrichedProducts.filter((p) => p.status === 'LOW_STOCK').length;
    const outOfStockCount = enrichedProducts.filter((p) => p.status === 'OUT_OF_STOCK').length;

    return res.json({
      warehouses,
      products: enrichedProducts,
      stats: {
        totalWarehouses: warehouses.length,
        totalSKUs: products.length,
        totalOnHand,
        totalReserved,
        totalAvailable,
        lowStockCount,
        outOfStockCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/fulfillment - List orders needing fulfillment
router.get('/', authenticateToken, requireRoles(['SALES_REP', 'FINANCE_OPERATIONS', 'ADMIN']), async (req: AuthRequest, res) => {
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
router.get('/:orderId/recommend', authenticateToken, requireRoles(['SALES_REP', 'FINANCE_OPERATIONS', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const recommendations = await recommendFulfillment(req.params.orderId);
    return res.json(recommendations);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/fulfillment/:orderId/accept - Accept split recommendation
router.post('/:orderId/accept', authenticateToken, requireRoles(['FINANCE_OPERATIONS', 'ADMIN']), async (req: AuthRequest, res) => {
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
    const parseResult = OverrideSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message } });
    }
    const { lineId, warehouseId, allocatedQty, reason } = parseResult.data;

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
