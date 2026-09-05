import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { RiskBadge } from '../components/RiskBadge';
import { ApprovalTracker } from '../components/ApprovalTracker';
import { CheckSquare, Check, RotateCcw, X, AlertTriangle, FileText, ArrowRight } from 'lucide-react';

export const ApprovalsList: React.FC = () => {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'RETURN' | 'REJECT' | null>(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadApprovals();
  }, []);

  async function loadApprovals() {
    try {
      setLoading(true);
      const data = await api.getApprovals();
      setApprovals(data || []);
    } catch (e) {
      console.error('Failed to load approvals:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleAction = async () => {
    if (!selectedApproval || !actionType) return;
    if ((actionType === 'RETURN' || actionType === 'REJECT') && !comment.trim()) {
      alert('Please enter a mandatory comment explaining your decision.');
      return;
    }

    try {
      setProcessing(true);
      if (actionType === 'APPROVE') {
        await api.approveStep(selectedApproval.id, comment);
      } else if (actionType === 'RETURN') {
        await api.returnStep(selectedApproval.id, comment);
      } else if (actionType === 'REJECT') {
        await api.rejectStep(selectedApproval.id, comment);
      }

      alert(`Action '${actionType}' executed successfully!`);
      setSelectedApproval(null);
      setActionType(null);
      setComment('');
      loadApprovals();
    } catch (e: any) {
      alert('Approval action failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-onyx flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-signal" />
          Discount Governance & Multi-Tier Approval Portal
        </h2>
        <p className="text-xs text-graphite">Review commercial proposals exceeding discount ceilings and enforce margin policies</p>
      </div>

      {/* Approvals Table */}
      <div className="bg-white border border-ash rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-fog text-charcoal uppercase font-semibold text-[10px]">
              <tr>
                <th className="p-3.5">Quote #</th>
                <th className="p-3.5">Customer & Tier</th>
                <th className="p-3.5">Net Total</th>
                <th className="p-3.5">Margin %</th>
                <th className="p-3.5">Blended Risk</th>
                <th className="p-3.5">Required Step Role</th>
                <th className="p-3.5">Approval Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash text-charcoal">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-whisper">Loading pending approvals...</td>
                </tr>
              ) : approvals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-whisper">No pending approval requests in queue.</td>
                </tr>
              ) : (
                approvals.map((reqItem) => {
                  const quote = reqItem.quotation;
                  const currentStep = reqItem.steps?.[reqItem.currentStepIndex];

                  return (
                    <tr key={reqItem.id} className="hover:bg-fog/70 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-signal">
                        <Link to={`/quotations/${quote?.id}`} className="hover:underline">
                          {quote?.quoteNumber}
                        </Link>
                      </td>
                      <td className="p-3.5 font-semibold text-onyx">
                        {quote?.customer?.name} ({quote?.customer?.tier})
                      </td>
                      <td className="p-3.5 font-mono font-bold text-onyx">₹{quote?.netTotal?.toFixed(2)}</td>
                      <td className="p-3.5 font-mono font-semibold text-emerald-600">{quote?.totalMarginPercent}%</td>
                      <td className="p-3.5">
                        <RiskBadge riskScore={quote?.riskScore || 0} riskBand={quote?.riskBand || 'LOW'} riskExplanationJson={quote?.riskExplanation} compact />
                      </td>
                      <td className="p-3.5 font-semibold text-amber-600">
                        {currentStep ? currentStep.roleRequired : 'Completed'}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          reqItem.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          reqItem.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-brand-50 text-signal border border-brand-100'
                        }`}>
                          {reqItem.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedApproval(reqItem)}
                          className="btn-primary inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-all"
                        >
                          Review & Action
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-ash rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-floating overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-ash pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-onyx">Review Approval Request: {selectedApproval.quotation?.quoteNumber}</h3>
                <p className="text-xs text-graphite">Customer: {selectedApproval.quotation?.customer?.name} ({selectedApproval.quotation?.customer?.tier} Tier)</p>
              </div>
              <button onClick={() => setSelectedApproval(null)} className="p-1 text-whisper hover:text-onyx rounded-lg hover:bg-fog">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Step Tracker */}
            <ApprovalTracker
              steps={selectedApproval.steps}
              currentStepIndex={selectedApproval.currentStepIndex}
              requestStatus={selectedApproval.status}
            />

            {/* Risk Breakdown Callout */}
            <div className="p-4 bg-fog rounded-xl border border-ash space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-charcoal">Blended Risk Assessment</span>
                <RiskBadge
                  riskScore={selectedApproval.quotation?.riskScore || 0}
                  riskBand={selectedApproval.quotation?.riskBand || 'LOW'}
                  riskExplanationJson={selectedApproval.quotation?.riskExplanation}
                />
              </div>
              <p className="text-xs text-graphite">
                Click the risk badge above to inspect exact weighted overage math and worst line penalty.
              </p>
            </div>

            {/* Line Items Exceeding Ceilings */}
            <div className="space-y-2">
              <h4 className="text-xs uppercase font-bold text-graphite tracking-wider">Quotation Line Items & Overages</h4>
              <div className="border border-ash rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-fog text-charcoal text-[10px] uppercase">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5">Qty</th>
                      <th className="p-2.5">Discount Given</th>
                      <th className="p-2.5">Allowed Ceiling</th>
                      <th className="p-2.5">Overage Status</th>
                    </tr>
                  </thead>
<tbody className="divide-y divide-ash text-charcoal">
                    {selectedApproval.quotation?.lines?.map((line: any) => (
                      <tr key={line.id}>
                        <td className="p-2.5 font-bold text-onyx">{line.product?.name}</td>
                        <td className="p-2.5 font-mono">{line.quantity}</td>
                        <td className="p-2.5 font-mono font-bold text-amber-600">{line.discountPercent}%</td>
                        <td className="p-2.5 font-mono text-graphite">{line.effectiveCeiling}%</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            line.overagePoints > 0 ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {line.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Selection */}
            <div className="space-y-3 pt-2 border-t border-ash">
              <label className="text-xs font-semibold text-charcoal">Approval Decision Action</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActionType('APPROVE')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-white text-charcoal border-ash hover:bg-fog'
                  }`}
                >
                  <Check className="w-4 h-4" /> Approve
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('RETURN')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                    actionType === 'RETURN'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-white text-charcoal border-ash hover:bg-fog'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" /> Return for Revision
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('REJECT')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                    actionType === 'REJECT'
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-white text-charcoal border-ash hover:bg-fog'
                  }`}
                >
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>

              {actionType && (
                <div className="space-y-1.5 animate-fade-in pt-1">
                  <label className="text-xs font-medium text-charcoal">
                    Decision Comment {actionType !== 'APPROVE' && <span className="text-rose-600">* Mandatory</span>}
                  </label>
                  <textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={actionType === 'APPROVE' ? 'Optional approval notes...' : 'State mandatory reason for returning or rejecting...'}
                    className="input rounded-lg p-2.5 text-xs"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedApproval(null)}
                  className="btn-ghost px-4 py-2 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={!actionType || processing}
                  className="btn-primary px-5 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Confirm Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
