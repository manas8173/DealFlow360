import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// GET /api/audit - List append-only audit logs
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { entityId, entityType } = req.query;
    const whereClause: any = {};

    if (entityId) whereClause.entityId = entityId as string;
    if (entityType) whereClause.entityType = entityType as string;

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return res.json(logs);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
