import { prisma } from '../lib/prisma';
import { logAudit } from './audit.service';

/**
 * Scans active quotations for stalled deals, discount anomalies, and delivery slippage.
 *
 * Alert types:
 *   STALLED           — quote inactive for > 7 days
 *   DISCOUNT_ANOMALY  — max line discount > 1.5× baseline average (configurable, default 8%)
 *   DELIVERY_SLIPPAGE — validity date within 3 days or already expired
 */
export async function evaluateDealHealthAlerts(userId?: string, role?: string) {
  const whereClause: any = {
    status: { in: ['DRAFT', 'PENDING_APPROVAL', 'SENT', 'UNDER_NEGOTIATION', 'APPROVED', 'CONFIRMED'] },
  };
  
  if (role === 'SALES_REP' && userId) {
    whereClause.ownerId = userId;
  }

  const activeQuotes = await prisma.quotation.findMany({
    where: whereClause,
    include: {
      customer: true,
      lines: true,
    },
  });

  const now = Date.now();
  const stalledThresholdMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const slippageWarningMs = 3 * 24 * 60 * 60 * 1000; // 3 days

  // Configurable discount baseline: 8% is the rep historical average default.
  // In a production system this should be computed per-rep from AuditLog history.
  const REP_AVERAGE_DISCOUNT_BASELINE = 8.0;
  const ANOMALY_MULTIPLIER = 1.5;

  for (const quote of activeQuotes) {
    // ── 1. STALLED DEAL CHECK ──────────────────────────────────────────────
    const lastActivity = new Date(quote.updatedAt).getTime();
    if (now - lastActivity > stalledThresholdMs) {
      const existing = await prisma.dealHealthAlert.findFirst({
        where: { quotationId: quote.id, alertType: 'STALLED', status: { in: ['ACTIVE', 'NUDGED', 'ESCALATED'] } },
      });

      if (!existing) {
        const idleDays = Math.floor((now - lastActivity) / (24 * 60 * 60 * 1000));
        await prisma.dealHealthAlert.create({
          data: {
            quotationId: quote.id,
            alertType: 'STALLED',
            severity: idleDays > 14 ? 'HIGH' : 'MEDIUM',
            message: `Quote ${quote.quoteNumber} for ${quote.customer.name} has been idle for ${idleDays} days.`,
            detailsJson: JSON.stringify({ idleDays, customerName: quote.customer.name }),
            status: 'ACTIVE',
          },
        });
      }
    }

    // ── 2. DISCOUNT ANOMALY CHECK ──────────────────────────────────────────
    // Only fire if quote has at least one line with a non-zero discount
    const lineDiscounts = quote.lines.map((l) => l.discountPercent);
    const maxDiscount = lineDiscounts.length > 0 ? Math.max(...lineDiscounts) : 0;

    if (maxDiscount > 0 && maxDiscount > REP_AVERAGE_DISCOUNT_BASELINE * ANOMALY_MULTIPLIER) {
      const existing = await prisma.dealHealthAlert.findFirst({
        where: { quotationId: quote.id, alertType: 'DISCOUNT_ANOMALY', status: { in: ['ACTIVE', 'NUDGED', 'ESCALATED'] } },
      });

      if (!existing) {
        const ratio = Math.round((maxDiscount / REP_AVERAGE_DISCOUNT_BASELINE) * 100) / 100;
        await prisma.dealHealthAlert.create({
          data: {
            quotationId: quote.id,
            alertType: 'DISCOUNT_ANOMALY',
            severity: ratio > 2.5 ? 'HIGH' : 'MEDIUM',
            message: `Discount anomaly on ${quote.quoteNumber}: ${maxDiscount}% max discount is ${ratio}× rep baseline (${REP_AVERAGE_DISCOUNT_BASELINE}%).`,
            detailsJson: JSON.stringify({ maxDiscount, repAverageDiscount: REP_AVERAGE_DISCOUNT_BASELINE, ratio }),
            status: 'ACTIVE',
          },
        });
      }
    }

    // ── 3. DELIVERY SLIPPAGE CHECK ─────────────────────────────────────────
    // Fire when the validity date is within 3 days or has already passed
    const validityMs = new Date(quote.validityDate).getTime();
    const msUntilExpiry = validityMs - now;

    if (msUntilExpiry <= slippageWarningMs) {
      const existing = await prisma.dealHealthAlert.findFirst({
        where: { quotationId: quote.id, alertType: 'DELIVERY_SLIPPAGE', status: { in: ['ACTIVE', 'NUDGED', 'ESCALATED'] } },
      });

      if (!existing) {
        const isExpired = msUntilExpiry < 0;
        const daysRemaining = Math.ceil(msUntilExpiry / (24 * 60 * 60 * 1000));
        const message = isExpired
          ? `Quote ${quote.quoteNumber} for ${quote.customer.name} has EXPIRED ${Math.abs(daysRemaining)} day(s) ago.`
          : `Quote ${quote.quoteNumber} for ${quote.customer.name} expires in ${daysRemaining} day(s).`;

        await prisma.dealHealthAlert.create({
          data: {
            quotationId: quote.id,
            alertType: 'DELIVERY_SLIPPAGE',
            severity: isExpired ? 'HIGH' : 'MEDIUM',
            message,
            detailsJson: JSON.stringify({
              validityDate: quote.validityDate,
              daysRemaining,
              isExpired,
            }),
            status: 'ACTIVE',
          },
        });
      }
    }
  }

  return await prisma.dealHealthAlert.findMany({
    include: {
      quotation: {
        include: {
          customer: true,
          owner: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Nudges rep, escalates, or resolves a deal health alert.
 */
export async function updateAlertStatus(alertId: string, action: 'NUDGE' | 'ESCALATE' | 'RESOLVE', userId: string, userName: string, userRole: string) {
  const alert = await prisma.dealHealthAlert.findUnique({
    where: { id: alertId },
  });

  if (!alert) throw new Error('Alert not found');

  const newStatus = action === 'NUDGE' ? 'NUDGED' : action === 'ESCALATE' ? 'ESCALATED' : 'RESOLVED';

  const updatedAlert = await prisma.dealHealthAlert.update({
    where: { id: alertId },
    data: { status: newStatus },
    include: {
      quotation: {
        include: {
          customer: true,
          owner: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
  });

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: userRole,
    entityType: 'DEAL_HEALTH_ALERT',
    entityId: alertId,
    action: action === 'NUDGE' ? 'ALERT_NUDGED' : action === 'ESCALATE' ? 'ALERT_ESCALATED' : 'ALERT_RESOLVED',
    afterState: { alertId, status: newStatus },
    reason: `Deal health alert updated via ${action}.`,
  });

  return updatedAlert;
}

/**
 * Deletes / dismisses a single deal health alert.
 */
export async function deleteAlert(alertId: string, userId: string, userName: string, userRole: string) {
  const alert = await prisma.dealHealthAlert.findUnique({
    where: { id: alertId },
  });

  if (!alert) throw new Error('Alert not found');

  await prisma.dealHealthAlert.delete({
    where: { id: alertId },
  });

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: userRole,
    entityType: 'DEAL_HEALTH_ALERT',
    entityId: alertId,
    action: 'ALERT_DISMISSED',
    beforeState: { alertId, status: alert.status },
    reason: `Deal health alert dismissed by ${userName}.`,
  });

  return { message: 'Alert successfully dismissed', id: alertId };
}

/**
 * Clears / deletes all deal health alerts.
 */
export async function clearAllAlerts(userId: string, userName: string, userRole: string) {
  const count = await prisma.dealHealthAlert.count();
  await prisma.dealHealthAlert.deleteMany();

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: userRole,
    entityType: 'DEAL_HEALTH_ALERT',
    entityId: 'ALL',
    action: 'ALL_ALERTS_CLEARED',
    reason: `All ${count} deal health alerts cleared by ${userName}.`,
  });

  return { message: `Successfully cleared ${count} deal health alert(s).`, count };
}
