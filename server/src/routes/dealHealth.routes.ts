import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { evaluateDealHealthAlerts, updateAlertStatus } from '../services/dealHealth.service';

const router = Router();

// GET /api/deal-health/alerts - Run deal health evaluation & return active alerts
router.get('/alerts', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const alerts = await evaluateDealHealthAlerts();
    return res.json(alerts);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/deal-health/alerts/:id/nudge - Nudge rep
router.post('/alerts/:id/nudge', authenticateToken, async (req: AuthRequest, res) => {
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

// POST /api/deal-health/alerts/:id/escalate - Escalate deal alert
router.post('/alerts/:id/escalate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const updated = await updateAlertStatus(
      req.params.id,
      'ESCALATE',
      req.user!.id,
      req.user!.name,
      req.user!.role
    );
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
