import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../services/audit.service';
import { Role, INTERNAL_ROLES } from '../lib/roles';

const router = Router();

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

// GET /api/admin/products - Catalog products (Internal employees)
router.get('/products', authenticateToken, requireRoles(INTERNAL_ROLES), async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true, variants: true, inventoryItems: { include: { warehouse: true } } },
    });
    return res.json(products);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/admin/categories (Internal employees)
router.get('/categories', authenticateToken, requireRoles(INTERNAL_ROLES), async (req, res) => {
  try {
    const categories = await prisma.productCategory.findMany();
    return res.json(categories);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/admin/tiers (Internal employees)
router.get('/tiers', authenticateToken, requireRoles(INTERNAL_ROLES), async (req, res) => {
  try {
    const tiers = await prisma.customerTier.findMany();
    return res.json(tiers);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/admin/warehouses (Internal employees)
router.get('/warehouses', authenticateToken, requireRoles(INTERNAL_ROLES), async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: { inventoryItems: { include: { product: true } } },
    });
    return res.json(warehouses);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/admin/customers (Internal employees)
router.get('/customers', authenticateToken, requireRoles(INTERNAL_ROLES), async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { users: true },
    });
    return res.json(customers);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// PATCH /api/admin/customers/:id - Update customer tier and information
router.patch('/customers/:id', authenticateToken, requireRoles(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { name, company, tier } = req.body;
    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    }

    const updated = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(company !== undefined ? { company } : {}),
        ...(tier !== undefined ? { tier } : {}),
      },
      include: { users: true },
    });

    await logAudit({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      entityType: 'CUSTOMER',
      entityId: updated.id,
      action: 'CUSTOMER_UPDATED',
      beforeState: { name: existing.name, company: existing.company, tier: existing.tier },
      afterState: { name: updated.name, company: updated.company, tier: updated.tier },
      reason: `Customer ${updated.company} updated by admin.`,
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/admin/reset-database - Hard reset database to seed state for demo.
// FIX: Uses spawn() instead of exec() to avoid shell injection.
router.post('/reset-database', authenticateToken, requireRoles([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const seedPath = path.resolve(__dirname, '../../../prisma/seed.ts');
    const child = spawn('npx', ['ts-node', seedPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false, // no shell — prevents injection
    });

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error('Reset database error:', stderr);
        return res.status(500).json({ error: { code: 'RESET_FAILED', message: stderr || 'Seed process exited with error' } });
      }
      return res.json({ message: 'Database reset and seed complete!', output: stdout });
    });

    child.on('error', (err) => {
      return res.status(500).json({ error: { code: 'RESET_FAILED', message: err.message } });
    });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/admin/products - Create a product
router.post('/products', authenticateToken, requireRoles(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { sku, name, description, categoryId, basePrice, unit, taxPercent, costPrice } = req.body;
    if (!sku || !name || !categoryId || basePrice === undefined) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'sku, name, categoryId and basePrice are required' } });
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description: description || null,
        categoryId,
        basePrice,
        unit: unit || 'unit',
        taxPercent: taxPercent ?? 0,
        costPrice: costPrice ?? 0,
      },
      include: { category: true },
    });

    await logAudit({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      entityType: 'PRODUCT',
      entityId: product.id,
      action: 'PRODUCT_CREATED',
      afterState: { sku: product.sku, name: product.name, basePrice: product.basePrice },
      reason: `Product ${product.sku} created by admin.`,
    });

    return res.status(201).json(product);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// PATCH /api/admin/products/:id - Update a product
router.patch('/products/:id', authenticateToken, requireRoles(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { name, description, categoryId, basePrice, unit, taxPercent, costPrice, sku } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(sku !== undefined ? { sku } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(basePrice !== undefined ? { basePrice } : {}),
        ...(unit !== undefined ? { unit } : {}),
        ...(taxPercent !== undefined ? { taxPercent } : {}),
        ...(costPrice !== undefined ? { costPrice } : {}),
      },
      include: { category: true },
    });

    await logAudit({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      entityType: 'PRODUCT',
      entityId: product.id,
      action: 'PRODUCT_UPDATED',
      afterState: { sku: product.sku, name: product.name, basePrice: product.basePrice },
      reason: `Product ${product.sku} updated by admin.`,
    });

    return res.json(product);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/admin/categories - Create a product category
router.post('/categories', authenticateToken, requireRoles(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { name, discountCeilingPercent } = req.body;
    if (!name || discountCeilingPercent === undefined) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name and discountCeilingPercent are required' } });
    }
    const category = await prisma.productCategory.create({ data: { name, discountCeilingPercent } });
    return res.status(201).json(category);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// PATCH /api/admin/categories/:id - Update a product category
router.patch('/categories/:id', authenticateToken, requireRoles(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { name, discountCeilingPercent } = req.body;
    const category = await prisma.productCategory.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(discountCeilingPercent !== undefined ? { discountCeilingPercent } : {}),
      },
    });
    return res.json(category);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// PATCH /api/admin/tiers/:tier - Update a customer tier discount limit
router.patch('/tiers/:tier', authenticateToken, requireRoles(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { maxDiscountPercent } = req.body;
    if (maxDiscountPercent === undefined || maxDiscountPercent < 0 || maxDiscountPercent > 100) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'maxDiscountPercent must be between 0 and 100' } });
    }
    const tier = await prisma.customerTier.update({
      where: { tier: req.params.tier },
      data: { maxDiscountPercent },
    });
    return res.json(tier);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/admin/warehouses - Create a warehouse
router.post('/warehouses', authenticateToken, requireRoles(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { name, code, location } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name and code are required' } });
    }
    const warehouse = await prisma.warehouse.create({ data: { name, code, location: location || name } });
    return res.status(201).json(warehouse);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// PATCH /api/admin/warehouses/:id - Update a warehouse
router.patch('/warehouses/:id', authenticateToken, requireRoles(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { name, code, location } = req.body;
    const warehouse = await prisma.warehouse.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code } : {}),
        ...(location !== undefined ? { location } : {}),
      },
    });
    return res.json(warehouse);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/admin/warehouses/:id/inventory - Upsert inventory stock at a warehouse
router.post('/warehouses/:id/inventory', authenticateToken, requireRoles(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { productId, onHandQty } = req.body;
    if (!productId || onHandQty === undefined || onHandQty < 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'productId and a non-negative onHandQty are required' } });
    }

    const item = await prisma.inventoryItem.upsert({
      where: { warehouseId_productId: { warehouseId: req.params.id, productId } },
      create: { warehouseId: req.params.id, productId, onHandQty, reservedQty: 0 },
      update: { onHandQty },
    });

    return res.json(item);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/admin/price-lists - Price lists with rules
router.get('/price-lists', authenticateToken, requireRoles(INTERNAL_ROLES), async (req, res) => {
  try {
    const priceLists = await prisma.priceList.findMany({
      include: { rules: { include: { product: true } } },
    });
    return res.json(priceLists);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/admin/price-lists - Create a price list
router.post('/price-lists', authenticateToken, requireRoles(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { name, currency, customerTier } = req.body;
    if (!name) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name is required' } });
    const priceList = await prisma.priceList.create({
      data: { name, currency: currency || 'INR', customerTier: customerTier || 'GOLD' },
    });
    return res.status(201).json(priceList);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/admin/price-lists/:id/rules - Add a rule to a price list
router.post('/price-lists/:id/rules', authenticateToken, requireRoles(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { productId, customPrice, discountAdjustment } = req.body;
    if (!productId) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'productId is required' } });

    const rule = await prisma.priceListRule.create({
      data: {
        priceListId: req.params.id,
        productId,
        customPrice: customPrice ?? null,
        discountAdjustment: discountAdjustment ?? 0,
      },
      include: { product: true },
    });
    return res.status(201).json(rule);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
