import { prisma } from '../lib/prisma';

export async function logAudit({
  actorId,
  actorName,
  actorRole,
  entityType,
  entityId,
  action,
  beforeState,
  afterState,
  reason,
}: {
  actorId: string;
  actorName: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeState?: any;
  afterState?: any;
  reason?: string;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorId,
        actorName,
        actorRole,
        entityType,
        entityId,
        action,
        beforeState: beforeState ? JSON.stringify(beforeState) : null,
        afterState: afterState ? JSON.stringify(afterState) : null,
        reason: reason || null,
      },
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
}
