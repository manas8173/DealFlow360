import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../services/audit.service';

const router = Router();

const ALLOWED_CHAIN_ROLES = ['SALES_MANAGER', 'FINANCE_OPERATIONS'];
const RISK_BANDS = ['LOW', 'MEDIUM', 'HIGH'];

// GET /api/discount-policy - Current customer tier limits + approval chains
router.get('/', authenticateToken, requireRoles(['SALES_MANAGER', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const [tiers, approvalPolicies] = await Promise.all([
      prisma.customerTier.findMany({ orderBy: { maxDiscountPercent: 'asc' } }),
      prisma.approvalPolicy.findMany({ orderBy: { minScore: 'asc' } }),
    ]);
    return res.json({ tiers, approvalPolicies });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// PATCH /api/discount-policy/tiers/:tier - Update customer tier discount limit
router.patch('/tiers/:tier', authenticateToken, requireRoles(['SALES_MANAGER', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { maxDiscountPercent } = req.body;
    if (maxDiscountPercent === undefined || maxDiscountPercent < 0 || maxDiscountPercent > 100) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'maxDiscountPercent must be between 0 and 100' } });
    }

    const existing = await prisma.customerTier.findUnique({ where: { tier: req.params.tier } });
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Tier not found' } });

    const updated = await prisma.customerTier.update({
      where: { tier: req.params.tier },
      data: { maxDiscountPercent },
    });

    await logAudit({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      entityType: 'CUSTOMER_TIER',
      entityId: updated.id,
      action: 'DISCOUNT_TIER_UPDATED',
      beforeState: { tier: existing.tier, maxDiscountPercent: existing.maxDiscountPercent },
      afterState: { tier: updated.tier, maxDiscountPercent: updated.maxDiscountPercent },
      reason: `Discount tier ceiling for ${updated.tier} updated to ${updated.maxDiscountPercent}%.`,
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// PATCH /api/discount-policy/approval-policy/:riskBand - Update approval chain for a risk band
router.patch('/approval-policy/:riskBand', authenticateToken, requireRoles(['SALES_MANAGER', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const riskBand = req.params.riskBand;
    if (!RISK_BANDS.includes(riskBand)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `riskBand must be one of ${RISK_BANDS.join(', ')}` } });
    }

    const { rolesRequired, minScore, maxScore } = req.body;

    if (rolesRequired !== undefined) {
      if (!Array.isArray(rolesRequired) || rolesRequired.some((r) => !ALLOWED_CHAIN_ROLES.includes(r))) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `rolesRequired must be a subset of [${ALLOWED_CHAIN_ROLES.join(', ')}]` } });
      }
    }

    const existing = await prisma.approvalPolicy.findUnique({ where: { riskBand } });
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Approval policy not found' } });

    if ((minScore !== undefined && (minScore < 0 || minScore > maxScore)) || (maxScore !== undefined && maxScore < (minScore ?? existing.minScore))) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid score range' } });
    }

    const updated = await prisma.approvalPolicy.update({
      where: { riskBand },
      data: {
        rolesRequired: rolesRequired !== undefined ? JSON.stringify(rolesRequired) : existing.rolesRequired,
        minScore: minScore !== undefined ? minScore : existing.minScore,
        maxScore: maxScore !== undefined ? maxScore : existing.maxScore,
      },
    });

    await logAudit({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      entityType: 'APPROVAL_POLICY',
      entityId: updated.id,
      action: 'APPROVAL_CHAIN_UPDATED',
      beforeState: { riskBand, rolesRequired: existing.rolesRequired, minScore: existing.minScore, maxScore: existing.maxScore },
      afterState: { riskBand, rolesRequired: updated.rolesRequired, minScore: updated.minScore, maxScore: updated.maxScore },
      reason: `Approval chain for ${riskBand} risk updated.`,
    });

    return res.json({ ...updated, rolesRequired: JSON.parse(updated.rolesRequired) });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;