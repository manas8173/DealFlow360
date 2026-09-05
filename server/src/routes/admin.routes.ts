import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../services/audit.service';
import { exec } from 'child_process';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

// GET /api/admin/signup-requests - Employee sign-up requests awaiting admin decision
router.get('/signup-requests', authenticateToken, requireRoles(['ADMIN']), async (req, res) => {
  try {
    const requests = await prisma.user.findMany({
      where: {
        role: { in: ['SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS'] },
        status: { in: ['PENDING_APPROVAL', 'REJECTED'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        company: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(requests);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/admin/signup-requests/:id/approve - Approve an employee sign-up request
router.post('/signup-requests/:id/approve', authenticateToken, requireRoles(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });

    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Sign-up request not found' } });
    if (user.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Request is not pending approval (current status: ${user.status})` } });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        company: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAudit({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      entityType: 'USER',
      entityId: user.id,
      action: 'EMPLOYEE_SIGNUP_APPROVED',
      beforeState: { email: user.email, status: user.status },
      afterState: { email: updated.email, status: updated.status },
      reason: `Approved employee sign-up for ${user.email} as ${user.role}.`,
    });

    return res.json({ message: 'Employee sign-up approved.', user: updated });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/admin/signup-requests/:id/reject - Reject an employee sign-up request
router.post('/signup-requests/:id/reject', authenticateToken, requireRoles(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });

    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Sign-up request not found' } });
    if (user.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Request is not pending approval (current status: ${user.status})` } });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: 'REJECTED' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        company: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAudit({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      entityType: 'USER',
      entityId: user.id,
      action: 'EMPLOYEE_SIGNUP_REJECTED',
      beforeState: { email: user.email, status: user.status },
      afterState: { email: updated.email, status: updated.status },
      reason: `Rejected employee sign-up for ${user.email}.`,
    });

    return res.json({ message: 'Employee sign-up rejected.', user: updated });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/admin/products - Catalog products
router.get('/products', authenticateToken, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true, variants: true, inventoryItems: { include: { warehouse: true } } },
    });
    return res.json(products);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/admin/categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await prisma.productCategory.findMany();
    return res.json(categories);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/admin/tiers
router.get('/tiers', authenticateToken, async (req, res) => {
  try {
    const tiers = await prisma.customerTier.findMany();
    return res.json(tiers);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/admin/warehouses
router.get('/warehouses', authenticateToken, async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: { inventoryItems: { include: { product: true } } },
    });
    return res.json(warehouses);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/admin/customers
router.get('/customers', authenticateToken, async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { users: true },
    });
    return res.json(customers);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/admin/reset-database - Hard reset database to seed state for live judge demoing!
router.post('/reset-database', authenticateToken, requireRoles(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const seedPath = path.resolve(__dirname, '../../../prisma/seed.ts');
    exec(`npx ts-node "${seedPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Reset database error:', stderr);
        return res.status(500).json({ error: { code: 'RESET_FAILED', message: stderr || error.message } });
      }
      return res.json({ message: 'Database reset and seed complete!', output: stdout });
    });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
