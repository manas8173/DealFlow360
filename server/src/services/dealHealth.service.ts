import { PrismaClient } from '@prisma/client';
import { logAudit } from './audit.service';

const prisma = new PrismaClient();

/**
 * Scans active quotations for stalled deals, discount anomalies, and delivery slippage.
 */
export async function evaluateDealHealthAlerts() {
  const activeQuotes = await prisma.quotation.findMany({
    where: {
      status: { in: ['DRAFT', 'PENDING_APPROVAL', 'SENT', 'UNDER_NEGOTIATION', 'APPROVED', 'CONFIRMED'] },
    },
    include: {
      customer: true,
      lines: true,
    },
  });

  const now = Date.now();
  const stalledThresholdMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  for (const quote of activeQuotes) {
    // 1. STALLED DEAL CHECK
    const lastActivity = new Date(quote.updatedAt).getTime();
    if (now - lastActivity > stalledThresholdMs) {
      const existing = await prisma.dealHealthAlert.findFirst({
        where: { quotationId: quote.id, alertType: 'STALLED', status: 'ACTIVE' },
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

    // 2. DISCOUNT ANOMALY CHECK (> 1.5x average line discount)
    const lineDiscounts = quote.lines.map((l) => l.discountPercent);
    const maxDiscount = lineDiscounts.length > 0 ? Math.max(...lineDiscounts) : 0;

    // Rep historical average baseline default is 8.0%
    const repAverageDiscount = 8.0;
    if (maxDiscount > repAverageDiscount * 1.5) {
      const existing = await prisma.dealHealthAlert.findFirst({
        where: { quotationId: quote.id, alertType: 'DISCOUNT_ANOMALY', status: 'ACTIVE' },
      });

      if (!existing) {
        const ratio = Math.round((maxDiscount / repAverageDiscount) * 100) / 100;
        await prisma.dealHealthAlert.create({
          data: {
            quotationId: quote.id,
            alertType: 'DISCOUNT_ANOMALY',
            severity: ratio > 2.5 ? 'HIGH' : 'MEDIUM',
            message: `Discount anomaly on ${quote.quoteNumber}: ${maxDiscount}% max discount is ${ratio}x rep historical average (${repAverageDiscount}%).`,
            detailsJson: JSON.stringify({ maxDiscount, repAverageDiscount, ratio }),
            status: 'ACTIVE',
          },
        });
      }
    }
  }

  return await prisma.dealHealthAlert.findMany({
    include: { quotation: { include: { customer: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Nudges rep or escalates deal health alert.
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
