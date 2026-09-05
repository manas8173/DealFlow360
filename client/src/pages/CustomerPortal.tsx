import React, { useEffect, useState } from 'react';
import { api, getStoredUser } from '../api';
import { Sparkles, MessageSquare, CheckCircle2, RotateCcw, Building, FileText, Send, AlertCircle } from 'lucide-react';

export const CustomerPortal: React.FC = () => {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [targetLineId, setTargetLineId] = useState('');
  const [counterDiscount, setCounterDiscount] = useState<number>(15);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const currentUser = getStoredUser();

  useEffect(() => {
    loadPortalData();
  }, []);

  async function loadPortalData() {
    try {
      setLoading(true);
      const data = await api.getPortalQuotations();
      setQuotations(data || []);
      if (data && data.length > 0) {
        // Load details for first quote
        const qDetail = await api.getPortalQuotation(data[0].id);
        setSelectedQuote(qDetail);
      }
    } catch (e) {
      console.error('Failed to load portal quotations:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectQuote = async (id: string) => {
    try {
      const qDetail = await api.getPortalQuotation(id);
      setSelectedQuote(qDetail);
    } catch (e: any) {
      alert('Failed to load quotation: ' + e.message);
    }
  };

  const handleOpenCounterModal = (line: any) => {
    setTargetLineId(line.id);
    setCounterDiscount(line.discountPercent + 5);
    setNotes('');
    setShowNegotiationModal(true);
  };

  const handleSubmitCounterDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuote) return;

    try {
      setProcessing(true);
      await api.submitCounterDiscount(selectedQuote.id, {
        lineId: targetLineId,
        requestedDiscountPercent: counterDiscount,
        notes,
      });

      alert('Counter discount proposal submitted to sales desk! Status updated to UNDER_NEGOTIATION.');
      setShowNegotiationModal(false);
      handleSelectQuote(selectedQuote.id);
    } catch (e: any) {
      alert('Failed to submit counter discount: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleInternalAcceptChangeRequest = async (changeRequestId: string) => {
    try {
      const res = await api.acceptChangeRequest(changeRequestId);
      if (res.reApprovalTriggered) {
        alert('Change accepted! Recalculated terms exceed policy threshold — Quote has automatically returned to PENDING_APPROVAL for managerial review.');
      } else {
        alert('Change accepted and applied to quotation!');
      }
      handleSelectQuote(selectedQuote.id);
    } catch (e: any) {
      alert('Acceptance error: ' + e.message);
    }
  };

  const handleConfirmQuote = async () => {
    if (!selectedQuote) return;
    if (!confirm('Confirm commercial terms for this quotation? Commercial terms will become locked.')) return;

    try {
      await api.confirmPortalQuotation(selectedQuote.id);
      alert('Quotation confirmed! Billing invoice and fulfillment orders generated.');
      handleSelectQuote(selectedQuote.id);
    } catch (e: any) {
      alert('Confirmation failed: ' + e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Customer Portal Top Banner */}
      <div className="bg-white border border-ash p-6 rounded-cards shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 border border-violet-200 text-violet-700 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            Customer Negotiation Portal
          </div>
          <h2 className="text-2xl font-extrabold text-onyx tracking-tight">Enterprise Quote Collaboration Desk</h2>
          <p className="text-xs text-graphite">Review commercial proposals, negotiate discount terms, and confirm orders</p>
        </div>
        <div className="flex items-center gap-2 bg-fog px-3 py-2 rounded-xl border border-ash text-xs text-charcoal">
          <Building className="w-4 h-4 text-violet-600" />
          <span>Customer Account: <strong className="text-onyx">{currentUser?.name}</strong></span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quotation Selector */}
        <div className="bg-white border border-ash rounded-cards p-4 space-y-3 shadow-sm">
          <h3 className="text-xs uppercase font-bold text-charcoal tracking-wider">My Commercial Quotations</h3>
          {loading ? (
            <p className="text-xs text-whisper py-6 text-center">Loading portal quotes...</p>
          ) : quotations.length === 0 ? (
            <p className="text-xs text-whisper py-6 text-center">No quotations available for customer account.</p>
          ) : (
            <div className="space-y-2">
              {quotations.map((q) => {
                const isSelected = selectedQuote?.id === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => handleSelectQuote(q.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-violet-50 border-violet-200 shadow-sm'
                        : 'bg-fog/70 border-ash hover:border-ash'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-violet-600 text-xs">{q.quoteNumber}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-extrabold uppercase bg-fog text-charcoal border border-ash">
                        {q.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-charcoal mt-2 font-mono font-bold">
                      <span>₹{q.netTotal?.toFixed(2)}</span>
                      <span className="text-[10px] text-whisper font-normal">Rev v{q.version}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 2 Columns: Quote Detail, Line Table & Negotiation Actions */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedQuote ? (
            <div className="bg-white border border-ash rounded-cards p-12 text-center text-whisper shadow-sm">
              Select a quotation from the list on the left.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Quote Detail Header & Confirmation Controls */}
              <div className="bg-white border border-ash rounded-cards p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-onyx font-mono">{selectedQuote.quoteNumber}</h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-violet-50 text-violet-700 border border-violet-200">
                      Rev v{selectedQuote.version}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase bg-fog text-charcoal border border-ash">
                      {selectedQuote.status}
                    </span>
                  </div>
                  <p className="text-xs text-graphite mt-1">Valid Until: {new Date(selectedQuote.validityDate).toLocaleDateString()}</p>
                </div>

                <div>
                  {selectedQuote.status === 'APPROVED' || selectedQuote.status === 'SENT' ? (
                    <button
                      onClick={handleConfirmQuote}
                      className="btn-primary px-5 py-2.5 text-xs flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm & Lock Quotation
                    </button>
                  ) : selectedQuote.status === 'PENDING_APPROVAL' ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Awaiting Internal Approval (Revised Terms)</span>
                    </div>
                  ) : selectedQuote.status === 'CONFIRMED' ? (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Quotation Terms Confirmed</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Pending Change Requests Notification */}
              {selectedQuote.changeRequests && selectedQuote.changeRequests.some((c: any) => c.status === 'PENDING') && (
                <div className="bg-violet-50 border border-violet-200 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-700 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-violet-600" />
                      Pending Customer Change Proposals
                    </span>
                    <span className="text-[10px] bg-violet-100 px-2 py-0.5 rounded text-violet-700 font-bold border border-violet-200">Action Required</span>
                  </div>
                  {selectedQuote.changeRequests.filter((c: any) => c.status === 'PENDING').map((cr: any) => (
                    <div key={cr.id} className="p-3 bg-white rounded-lg border border-ash flex items-center justify-between text-xs">
                      <div>
                        <p className="text-onyx font-semibold">
                          Proposed Counter Discount: <strong className="text-amber-600">{cr.requestedDiscountPercent}%</strong>
                        </p>
                        <p className="text-[11px] text-graphite">Notes: {cr.notes}</p>
                      </div>
                      <button
                        onClick={() => handleInternalAcceptChangeRequest(cr.id)}
                        className="btn-primary px-3 py-1.5 text-xs"
                      >
                        Accept & Trigger Re-Approval
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Line Items Table */}
              <div className="bg-white border border-ash rounded-cards overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-fog text-charcoal uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="p-3.5">Product Item</th>
                      <th className="p-3.5">Qty</th>
                      <th className="p-3.5">Unit Price</th>
                      <th className="p-3.5">Discount</th>
                      <th className="p-3.5">Total Net Amount</th>
                      <th className="p-3.5 text-right">Negotiation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ash text-charcoal">
                    {selectedQuote.lines?.map((line: any) => (
                      <tr key={line.id}>
                        <td className="p-3.5 font-bold text-onyx">
                          {line.product?.name}
                          {line.isRecurring && (
                            <span className="ml-2 text-[10px] text-signal bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded font-normal">
                              Recurring ({line.billingCycle})
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono">{line.quantity}</td>
                        <td className="p-3.5 font-mono">₹{line.unitPrice?.toFixed(2)}</td>
                        <td className="p-3.5 font-mono text-amber-600">{line.discountPercent}%</td>
                        <td className="p-3.5 font-mono font-bold text-onyx">₹{line.totalAmount?.toFixed(2)}</td>
                        <td className="p-3.5 text-right">
                          {selectedQuote.status !== 'CONFIRMED' && (
                            <button
                              onClick={() => handleOpenCounterModal(line)}
                              className="px-2.5 py-1 bg-fog hover:bg-indigo-600 text-charcoal hover:text-white rounded text-[11px] font-semibold transition-colors"
                            >
                              Counter Discount
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer Totals */}
                <div className="bg-fog p-4 border-t border-ash flex justify-between items-center text-xs">
                  <span className="text-charcoal uppercase font-medium">Commercial Total Net</span>
                  <span className="text-xl font-extrabold text-signal font-mono">₹{selectedQuote.netTotal?.toFixed(2)}</span>
                </div>
              </div>

              {/* Discussion Message Drawer */}
              <div className="bg-white border border-ash rounded-cards p-5 space-y-3 shadow-sm">
                <h4 className="text-xs uppercase font-bold text-charcoal tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-violet-600" />
                  Negotiation Communication Log
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2">
                  {selectedQuote.negotiationThread?.messages?.length === 0 ? (
                    <p className="text-xs text-whisper text-center py-4">No negotiation messages logged yet.</p>
                  ) : (
                    selectedQuote.negotiationThread?.messages?.map((msg: any) => (
                      <div key={msg.id} className="p-2.5 bg-fog rounded-lg text-xs space-y-1 border border-ash">
                        <div className="flex items-center justify-between text-[10px] text-graphite">
                          <span className="font-bold text-violet-600">{msg.senderName} ({msg.senderRole})</span>
                          <span className="font-mono">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-onyx">{msg.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Counter Discount Submission Modal */}
      {showNegotiationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-ash rounded-cards max-w-md w-full p-6 space-y-4 shadow-floating">
            <div className="flex items-center justify-between border-b border-ash pb-3">
              <h3 className="text-lg font-bold text-onyx">Propose Counter Discount</h3>
              <button onClick={() => setShowNegotiationModal(false)} className="text-whisper hover:text-onyx">✕</button>
            </div>

            <form onSubmit={handleSubmitCounterDiscount} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Proposed Discount Percent (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={counterDiscount}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setCounterDiscount(parseFloat(e.target.value) || 0)}
                  className="input w-full text-sm font-mono font-bold text-amber-600"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Negotiation Notes / Business Context</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Requesting 15% discount for bulk commitment across Q4..."
                  className="input w-full p-2.5 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNegotiationModal(false)}
                  className="btn-ghost px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="btn-primary px-4 py-2 text-xs"
                >
                  {processing ? 'Submitting...' : 'Submit Counter Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
