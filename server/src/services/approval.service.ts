import { PrismaClient } from '@prisma/client';
import { logAudit } from './audit.service';

const prisma = new PrismaClient();

/**
 * Submits a quotation for approval.
 * Evaluates risk score:
 * - If LOW risk: Quote is directly APPROVED (no approval steps required).
 * - If MEDIUM/HIGH risk: Quote transitions to PENDING_APPROVAL and creates an ApprovalRequest with required steps.
 */
export async function submitQuotationForApproval(quoteId: string, userId: string, userName: string, userRole: string) {
  const quote = await prisma.quotation.findUnique({
    where: { id: quoteId },
    include: {
      lines: { include: { product: true } },
      customer: true,
    },
  });

  if (!quote) throw new Error('Quotation not found');

  const beforeState = { status: quote.status, riskBand: quote.riskBand, version: quote.version };

  // Check risk band
  if (quote.riskBand === 'LOW') {
    const updated = await prisma.quotation.update({
      where: { id: quoteId },
      data: { status: 'APPROVED' },
    });

    await logAudit({
      actorId: userId,
      actorName: userName,
      actorRole: userRole,
      entityType: 'QUOTATION',
      entityId: quoteId,
      action: 'QUOTE_APPROVED_AUTOMATIC',
      beforeState,
      afterState: { status: 'APPROVED', riskBand: 'LOW' },
      reason: 'Low risk quotation automatically approved without managerial intervention.',
    });

    return { status: 'APPROVED', message: 'Quotation approved automatically due to LOW risk profile.' };
  }

  // Determine required roles from risk explanation
  let rolesRequired: string[] = ['SALES_MANAGER'];
  try {
    const riskExp = JSON.parse(quote.riskExplanation);
    if (Array.isArray(riskExp.requiredApprovalChain) && riskExp.requiredApprovalChain.length > 0) {
      rolesRequired = riskExp.requiredApprovalChain;
    }
  } catch {
    if (quote.riskBand === 'HIGH') rolesRequired = ['SALES_MANAGER', 'FINANCE_OPERATIONS'];
  }

  // Transition quote status to PENDING_APPROVAL
  const updatedQuote = await prisma.quotation.update({
    where: { id: quoteId },
    data: { status: 'PENDING_APPROVAL' },
  });

  // Create ApprovalRequest
  const approvalRequest = await prisma.approvalRequest.create({
    data: {
      quotationId: quoteId,
      quoteVersion: quote.version,
      status: 'PENDING',
      currentStepIndex: 0,
      steps: {
        create: rolesRequired.map((role, idx) => ({
          stepOrder: idx,
          roleRequired: role,
          status: idx === 0 ? 'PENDING' : 'PENDING',
        })),
      },
    },
    include: { steps: true },
  });

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: userRole,
    entityType: 'QUOTATION',
    entityId: quoteId,
    action: 'APPROVAL_CREATED',
    beforeState,
    afterState: { status: 'PENDING_APPROVAL', approvalRequestId: approvalRequest.id, steps: rolesRequired },
    reason: `Submitted for approval. Risk Score: ${quote.riskScore} (${quote.riskBand})`,
  });

  return { status: 'PENDING_APPROVAL', approvalRequest };
}

/**
 * Processes an approval step action (APPROVE, RETURN, REJECT).
 */
export async function processApprovalStep({
  approvalRequestId,
  userId,
  userName,
  userRole,
  action,
  comment,
}: {
  approvalRequestId: string;
  userId: string;
  userName: string;
  userRole: string;
  action: 'APPROVE' | 'RETURN' | 'REJECT';
  comment?: string;
}) {
  const approvalReq = await prisma.approvalRequest.findUnique({
    where: { id: approvalRequestId },
    include: {
      steps: { orderBy: { stepOrder: 'asc' } },
      quotation: true,
    },
  });

  if (!approvalReq) throw new Error('Approval request not found');
  if (approvalReq.status !== 'PENDING') {
    throw new Error(`Approval request is already ${approvalReq.status}`);
  }

  const currentStep = approvalReq.steps[approvalReq.currentStepIndex];
  if (!currentStep) throw new Error('No current active approval step found');

  // Verify role authorization
  if (userRole !== 'ADMIN' && userRole !== currentStep.roleRequired) {
    throw new Error(`Unauthorized: Step requires role ${currentStep.roleRequired}, but user is ${userRole}`);
  }

  const beforeState = { requestStatus: approvalReq.status, stepStatus: currentStep.status, quoteStatus: approvalReq.quotation.status };

  if (action === 'REJECT') {
    if (!comment) throw new Error('Rejection reason comment is required');

    await prisma.approvalStep.update({
      where: { id: currentStep.id },
      data: {
        status: 'REJECTED',
        approverId: userId,
        comment,
        actionDate: new Date(),
      },
    });

    await prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: { status: 'REJECTED' },
    });

    await prisma.quotation.update({
      where: { id: approvalReq.quotationId },
      data: { status: 'REJECTED' },
    });

    await logAudit({
      actorId: userId,
      actorName: userName,
      actorRole: userRole,
      entityType: 'QUOTATION',
      entityId: approvalReq.quotationId,
      action: 'APPROVAL_REJECTED',
      beforeState,
      afterState: { requestStatus: 'REJECTED', quoteStatus: 'REJECTED' },
      reason: comment,
    });

    return { status: 'REJECTED', message: 'Quotation approval rejected.' };
  }

  if (action === 'RETURN') {
    if (!comment) throw new Error('Return for revision reason comment is required');

    await prisma.approvalStep.update({
      where: { id: currentStep.id },
      data: {
        status: 'RETURNED',
        approverId: userId,
        comment,
        actionDate: new Date(),
      },
    });

    await prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: { status: 'RETURNED' },
    });

    await prisma.quotation.update({
      where: { id: approvalReq.quotationId },
      data: { status: 'REVISION_REQUIRED' },
    });

    await logAudit({
      actorId: userId,
      actorName: userName,
      actorRole: userRole,
      entityType: 'QUOTATION',
      entityId: approvalReq.quotationId,
      action: 'APPROVAL_RETURNED',
      beforeState,
      afterState: { requestStatus: 'RETURNED', quoteStatus: 'REVISION_REQUIRED' },
      reason: comment,
    });

    return { status: 'RETURNED', message: 'Quotation returned for revision.' };
  }

  if (action === 'APPROVE') {
    await prisma.approvalStep.update({
      where: { id: currentStep.id },
      data: {
        status: 'APPROVED',
        approverId: userId,
        comment: comment || 'Approved',
        actionDate: new Date(),
      },
    });

    const isLastStep = approvalReq.currentStepIndex >= approvalReq.steps.length - 1;

    if (isLastStep) {
      // All steps completed! Quote is APPROVED
      await prisma.approvalRequest.update({
        where: { id: approvalRequestId },
        data: { status: 'APPROVED' },
      });

      await prisma.quotation.update({
        where: { id: approvalReq.quotationId },
        data: { status: 'APPROVED' },
      });

      await logAudit({
        actorId: userId,
        actorName: userName,
        actorRole: userRole,
        entityType: 'QUOTATION',
        entityId: approvalReq.quotationId,
        action: 'APPROVAL_APPROVED',
        beforeState,
        afterState: { requestStatus: 'APPROVED', quoteStatus: 'APPROVED' },
        reason: comment || 'Final step approved.',
      });

      return { status: 'APPROVED', message: 'Quotation fully approved!' };
    } else {
      // Advance to next step
      const nextStepIndex = approvalReq.currentStepIndex + 1;
      await prisma.approvalRequest.update({
        where: { id: approvalRequestId },
        data: { currentStepIndex: nextStepIndex },
      });

      await logAudit({
        actorId: userId,
        actorName: userName,
        actorRole: userRole,
        entityType: 'QUOTATION',
        entityId: approvalReq.quotationId,
        action: 'APPROVAL_STEP_APPROVED',
        beforeState,
        afterState: { currentStepIndex: nextStepIndex, nextRoleRequired: approvalReq.steps[nextStepIndex].roleRequired },
        reason: comment || 'Step approved, advanced to next approval level.',
      });

      return { status: 'PENDING_NEXT_STEP', message: `Step approved. Next required approval role: ${approvalReq.steps[nextStepIndex].roleRequired}` };
    }
  }

  throw new Error(`Invalid approval action: ${action}`);
}
