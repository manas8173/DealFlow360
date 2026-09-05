import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, ShieldAlert, Info, X } from 'lucide-react';

interface RiskBadgeProps {
  riskScore: number;
  riskBand: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  riskExplanationJson?: string;
  compact?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ riskScore, riskBand, riskExplanationJson, compact = false }) => {
  const [showModal, setShowModal] = useState(false);

  let explanation: any = null;
  if (riskExplanationJson) {
    try {
      explanation = JSON.parse(riskExplanationJson);
    } catch (e) {
      explanation = null;
    }
  }

  const getBadgeStyle = () => {
    switch (riskBand) {
      case 'HIGH':
        return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'LOW':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getIcon = () => {
    switch (riskBand) {
      case 'HIGH':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />;
      case 'MEDIUM':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
      case 'LOW':
      default:
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        <span
          onClick={() => explanation && setShowModal(true)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold cursor-pointer transition-all hover:scale-105 ${getBadgeStyle()}`}
          title="Click to view risk scoring explanation"
        >
          {getIcon()}
          <span>{riskBand} RISK</span>
          <span className="opacity-70 font-mono">({riskScore.toFixed(2)})</span>
          {explanation && <Info className="w-3 h-3 ml-0.5 opacity-50 hover:opacity-100" />}
        </span>
      </div>

      {/* Explanation Modal */}
      {showModal && explanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-ash rounded-cards max-w-lg w-full p-6 shadow-floating space-y-4">
            <div className="flex items-center justify-between border-b border-ash pb-3">
              <div className="flex items-center gap-2">
                {getIcon()}
                <h3 className="text-lg font-bold text-onyx">Blended Discount Risk Score Breakdown</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-whisper hover:text-onyx p-1 rounded-lg hover:bg-fog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-fog p-3 rounded-lg border border-ash">
                <p className="text-graphite text-xs uppercase font-medium">Worst Offending Line</p>
                <p className="text-onyx font-semibold mt-1">{explanation.worstLine || 'N/A'}</p>
              </div>

              <div className="bg-fog p-3 rounded-lg border border-ash">
                <p className="text-graphite text-xs uppercase font-medium">Discount Given vs Allowed</p>
                <p className="text-amber-600 font-semibold mt-1">
                  {explanation.givenDiscount}% <span className="text-graphite font-normal">given</span> / {explanation.allowedDiscount}% <span className="text-graphite font-normal">limit</span>
                </p>
              </div>

              <div className="bg-fog p-3 rounded-lg border border-ash">
                <p className="text-graphite text-xs uppercase font-medium">Worst Line Overage</p>
                <p className="text-rose-600 font-semibold mt-1">+{explanation.overagePoints}pt</p>
              </div>

              <div className="bg-fog p-3 rounded-lg border border-ash">
                <p className="text-graphite text-xs uppercase font-medium">Weighted Overage Risk</p>
                <p className="text-onyx font-semibold mt-1 font-mono">{explanation.weightedRisk}</p>
              </div>

              <div className="bg-fog p-3 rounded-lg border border-ash">
                <p className="text-graphite text-xs uppercase font-medium">Worst Overage Penalty (50%)</p>
                <p className="text-onyx font-semibold mt-1 font-mono">+{explanation.worstOveragePenalty}</p>
              </div>

              <div className="bg-brand-50 p-3 rounded-lg border border-brand-100">
                <p className="text-signal text-xs uppercase font-medium">Final Score & Risk Band</p>
                <p className="text-onyx font-bold mt-1 text-base">
                  {explanation.riskScore} <span className="text-xs uppercase font-semibold text-signal">({explanation.riskBand})</span>
                </p>
              </div>
            </div>

            <div className="bg-fog p-3 rounded-lg border border-ash text-xs text-graphite">
              <span className="font-semibold text-onyx">Required Approval Chain: </span>
              {explanation.requiredApprovalChain && explanation.requiredApprovalChain.length > 0 ? (
                <span className="text-signal font-medium">{explanation.requiredApprovalChain.join(' → ')}</span>
              ) : (
                <span className="text-emerald-700">No Managerial Approval Required</span>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};