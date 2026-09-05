import React from 'react';
import { CheckCircle2, Clock, XCircle, RotateCcw, ArrowRight } from 'lucide-react';

interface ApprovalStepData {
  id: string;
  stepOrder: number;
  roleRequired: string;
  status: 'PENDING' | 'APPROVED' | 'RETURNED' | 'REJECTED' | string;
  approver?: { name: string; email: string } | null;
  comment?: string | null;
  actionDate?: string | null;
}

interface ApprovalTrackerProps {
  steps: ApprovalStepData[];
  currentStepIndex: number;
  requestStatus: string;
}

export const ApprovalTracker: React.FC<ApprovalTrackerProps> = ({ steps, currentStepIndex, requestStatus }) => {
  if (!steps || steps.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700 font-medium flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" />
        <span>Direct Approval: Low risk profile. No managerial approval steps required.</span>
      </div>
    );
  }

  const getStepIcon = (stepStatus: string, isCurrent: boolean) => {
    switch (stepStatus) {
      case 'APPROVED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-rose-500" />;
      case 'RETURNED':
        return <RotateCcw className="w-5 h-5 text-amber-500" />;
      case 'PENDING':
      default:
        return <Clock className={`w-5 h-5 ${isCurrent ? 'text-signal animate-pulse' : 'text-whisper'}`} />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SALES_MANAGER':
        return 'Sales Manager';
      case 'FINANCE_OPERATIONS':
        return 'Finance Operations';
      case 'ADMIN':
        return 'System Admin';
      default:
        return role;
    }
  };

  const getStatusStyle = () => {
    switch (requestStatus) {
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'RETURNED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-sky-50 text-sky-700 border-sky-200';
    }
  };

  return (
    <div className="bg-white border border-ash rounded-cards p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-xs uppercase font-semibold text-graphite tracking-tight">Approval Routing Chain</h4>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getStatusStyle()}`}>
          {requestStatus}
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-2">
        {steps.map((step, idx) => {
          const isCurrent = idx === currentStepIndex && requestStatus === 'PENDING';
          const isPassed = step.status === 'APPROVED';

          return (
            <React.Fragment key={step.id}>
              <div className={`flex items-center gap-3 p-3 rounded-lg border flex-1 min-w-[200px] ${
                isCurrent ? 'bg-brand-50 border-brand-200 shadow-sm' :
                isPassed ? 'bg-white border-emerald-100' : 'bg-fog border-ash'
              }`}>
                {getStepIcon(step.status, isCurrent)}
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-onyx">{getRoleLabel(step.roleRequired)}</p>
                  <p className="text-graphite text-[11px]">
                    {step.approver ? step.approver.name : isCurrent ? 'Awaiting Action' : 'Pending'}
                  </p>
                  {step.comment && (
                    <p className="text-amber-600/90 text-[10px] italic">"{step.comment}"</p>
                  )}
                </div>
              </div>
              {idx < steps.length - 1 && <ArrowRight className="w-4 h-4 text-whisper shrink-0" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};