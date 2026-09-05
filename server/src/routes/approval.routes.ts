import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.middleware';
import { processApprovalStep } from '../services/approval.service';

const router = Router();
const prisma = new PrismaClient();

// GET /api/approvals - List pending approval requests for Sales Manager or Finance
router.get('/', authenticateToken, requireRoles(['SALES_MANAGER', 'FINANCE_OPERATIONS', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const userRole = req.user!.role;

    const approvalRequests = await prisma.approvalRequest.findMany({
      include: {
        quotation: {
          include: {
            customer: true,
            owner: true,
            lines: { include: { product: true } },
          },
        },
        steps: { include: { approver: true }, orderBy: { stepOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter to requests where current step matches user role or user is admin
    const pendingForUser = approvalRequests.filter((reqItem) => {
      if (userRole === 'ADMIN') return true;
      if (reqItem.status !== 'PENDING') return true; // Show history
      const currentStep = reqItem.steps[reqItem.currentStepIndex];
      return currentStep && currentStep.roleRequired === userRole;
    });

    return res.json(pendingForUser);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/approvals/:id - Get approval detail
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const approvalReq = await prisma.approvalRequest.findUnique({
      where: { id: req.params.id },
      include: {
        quotation: {
          include: {
            customer: true,
            owner: true,
            lines: { include: { product: true } },
          },
        },
        steps: { include: { approver: true }, orderBy: { stepOrder: 'asc' } },
      },
    });

    if (!approvalReq) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Approval request not found' } });
    return res.json(approvalReq);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/approvals/:id/approve - Approve current step
router.post('/:id/approve', authenticateToken, requireRoles(['SALES_MANAGER', 'FINANCE_OPERATIONS', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { comment } = req.body;
    const result = await processApprovalStep({
      approvalRequestId: req.params.id,
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'APPROVE',
      comment,
    });
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: { code: 'APPROVAL_ERROR', message: error.message } });
  }
});

// POST /api/approvals/:id/return - Return for revision
router.post('/:id/return', authenticateToken, requireRoles(['SALES_MANAGER', 'FINANCE_OPERATIONS', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Comment is required when returning for revision' } });

    const result = await processApprovalStep({
      approvalRequestId: req.params.id,
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'RETURN',
      comment,
    });
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: { code: 'APPROVAL_ERROR', message: error.message } });
  }
});

// POST /api/approvals/:id/reject - Reject quotation
router.post('/:id/reject', authenticateToken, requireRoles(['SALES_MANAGER', 'FINANCE_OPERATIONS', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Comment is required when rejecting approval' } });

    const result = await processApprovalStep({
      approvalRequestId: req.params.id,
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'REJECT',
      comment,
    });
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: { code: 'APPROVAL_ERROR', message: error.message } });
  }
});

export default router;
