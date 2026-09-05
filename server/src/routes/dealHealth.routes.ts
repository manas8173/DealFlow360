import { Router } from 'express';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.middleware';
import {
  evaluateDealHealthAlerts,
  updateAlertStatus,
  deleteAlert,
  clearAllAlerts,
} from '../services/dealHealth.service';

const router = Router();

// GET /api/deal-health/alerts - Run deal health evaluation & return active alerts
router.get('/alerts', authenticateToken, requireRoles(['SALES_MANAGER', 'ADMIN', 'SALES_REP']), async (req: AuthRequest, res) => {
  try {
    const alerts = await evaluateDealHealthAlerts(req.user?.id, req.user?.role);
    return res.json(alerts);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/deal-health/alerts/:id/nudge - Nudge rep
router.post('/alerts/:id/nudge', authenticateToken, requireRoles(['SALES_MANAGER', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const updated = await updateAlertStatus(
      req.params.id,
      'NUDGE',
      req.user!.id,
      req.user!.name,
      req.user!.role
    );
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/deal-health/alerts/:id/resolve - Resolve deal alert
router.post('/alerts/:id/resolve', authenticateToken, requireRoles(['SALES_MANAGER', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const updated = await updateAlertStatus(
      req.params.id,
      'RESOLVE',
      req.user!.id,
      req.user!.name,
      req.user!.role
    );
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// DELETE /api/deal-health/alerts/:id - Dismiss / remove a single deal health alert
router.delete('/alerts/:id', authenticateToken, requireRoles(['SALES_MANAGER', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const result = await deleteAlert(
      req.params.id,
      req.user!.id,
      req.user!.name,
      req.user!.role
    );
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/deal-health/alerts/clear-all - Clear / delete all deal health alerts
router.post('/alerts/clear-all', authenticateToken, requireRoles(['SALES_MANAGER', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const result = await clearAllAlerts(
      req.user!.id,
      req.user!.name,
      req.user!.role
    );
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
