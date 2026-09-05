import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, getStoredUser } from '../api';
import { RiskBadge } from '../components/RiskBadge';
import { ApprovalTracker } from '../components/ApprovalTracker';
import { useToast } from '../components/Toast';
import {
  FileText,
  Plus,
  Trash2,
  Send,
  CheckSquare,
  Sparkles,
  ArrowLeft,
  Building,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Info,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Truck,
  Receipt,
  ArrowRight,
  MessageSquare,
  ExternalLink,
  Repeat,
  DollarSign,
  Warehouse,
} from 'lucide-react';

export const QuotationBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [quote, setQuote] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingProductId, setAddingProductId] = useState('');
  const [addingQuantity, setAddingQuantity] = useState<string>('1');
  const [addingDiscount, setAddingDiscount] = useState<string>('0');
  const [lineQtyDrafts, setLineQtyDrafts] = useState<{ [lineId: string]: string }>({});
  const [lineDiscountDrafts, setLineDiscountDrafts] = useState<{ [lineId: string]: string }>({});
  const [addError, setAddError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const currentUser = getStoredUser();
  const role = currentUser?.role;
  const canEdit = role === 'SALES_REP' || role === 'ADMIN';

  useEffect(() => {
    if (id) loadQuotationDetails();
  }, [id]);

  async function loadQuotationDetails() {
    try {
      setLoading(true);
      const [qData, pData, rData] = await Promise.all([
        api.getQuotation(id!),
        api.getProducts().catch(() => []),
        api.getRecommendations(id!).catch(() => []),
      ]);
      setQuote(qData);
      setProducts(pData || []);
      setRecommendations(rData || []);
      if (pData && pData.length > 0) setAddingProductId(pData[0].id);
    } catch (e: any) {
      console.error('Failed to load quotation builder:', e);
      toast.error('Failed to load quotation: ' + (e.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  const handleLineUpdate = async (lineId: string, quantity: number, discountPercent: number) => {
    try {
      const updated = await api.updateLineItem(id!, lineId, { quantity, discountPercent });
      setQuote(updated);
      const recs = await api.getRecommendations(id!).catch(() => []);
      setRecommendations(recs);
    } catch (e: any) {
      toast.error('Failed to update line: ' + e.message);
    }
  };

  const handleRemoveLine = async (lineId: string) => {
    try {
      const updated = await api.deleteLineItem(id!, lineId);
      setQuote(updated);
      toast.info('Item removed from quotation.');
      const recs = await api.getRecommendations(id!).catch(() => []);
      setRecommendations(recs);
    } catch (e: any) {
      toast.error('Failed to remove line: ' + e.message);
    }
  };

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!addingProductId) {
      setAddError('Please select a product to add.');
      return;
    }
    const qty = parseInt(addingQuantity, 10);
    if (!addingQuantity || isNaN(qty) || qty < 1) {
      setAddError('Please enter a valid quantity (at least 1).');
      return;
    }
    if (qty > 100000) {
      setAddError('Quantity looks too large. Please enter a value up to 100,000.');
      return;
    }
    try {
      const updated = await api.addLineItem(id!, {
        productId: addingProductId,
        quantity: qty,
        discountPercent: parseFloat(addingDiscount) || 0,
      });
      setQuote(updated);
      setAddingQuantity('1');
      setAddingDiscount('0');
      toast.success('Line item added to quotation!');
      const recs = await api.getRecommendations(id!).catch(() => []);
      setRecommendations(recs);
    } catch (e: any) {
      toast.error('Failed to add line item: ' + e.message);
    }
  };

  const handleAddRecommendation = async (productId: string, promoDiscount?: number) => {
    try {
      const updated = await api.addRecommendation(id!, productId, promoDiscount);
      setQuote(updated);
      toast.success('Recommendation added to quote!');
      const recs = await api.getRecommendations(id!).catch(() => []);
      setRecommendations(recs);
    } catch (e: any) {
      toast.error('Failed to add recommendation: ' + e.message);
    }
  };

  const handleSubmitApproval = async () => {
    try {
      setActionInProgress(true);
      const res = await api.submitQuotation(id!);
      if (res.result?.status === 'APPROVED') {
        toast.success('Deal automatically approved due to LOW risk profile! Ready to send to customer.');
      } else {
        toast.info(res.result?.message || 'Quotation submitted for multi-level approval!');
      }
      loadQuotationDetails();
    } catch (e: any) {
      toast.error('Submission failed: ' + e.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSendToCustomer = async () => {
    try {
      setActionInProgress(true);
      await api.sendQuotation(id!);
      toast.success('Quotation sent to Customer Portal! Customer can now review or counter-offer.');
      loadQuotationDetails();
    } catch (e: any) {
      toast.error('Failed to send quote: ' + e.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleAcceptCounterProposal = async (changeRequestId: string) => {
    try {
      setActionInProgress(true);
      const res = await api.acceptChangeRequest(changeRequestId);
      if (res.reApprovalTriggered) {
        toast.warning(
          'Counter discount accepted! New terms exceed discount policy threshold — deal automatically submitted to PENDING_APPROVAL for managerial review.'
        );
      } else {
        toast.success('Customer counter-offer accepted and applied to quotation!');
      }
      loadQuotationDetails();
    } catch (e: any) {
      toast.error('Failed to accept counter-offer: ' + e.message);
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading || !quote) {
    return (
      <div className="flex items-center justify-center py-20 text-graphite">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        <span>Loading Deal Studio...</span>
      </div>
    );
  }

  // ── Compute Deal Stage (1 to 6) ─────────────────────────────────────────────
  const stageMap: Record<string, { step: number; title: string; desc: string }> = {
    DRAFT: { step: 1, title: 'Drafting & Pricing', desc: 'Configure line items & discount margins' },
    PENDING_APPROVAL: { step: 2, title: 'Governance Review', desc: 'Awaiting Manager / Finance sign-off' },
    REVISION_REQUIRED: { step: 2, title: 'Revision Required', desc: 'Approval returned with feedback — adjust discounts' },
    APPROVED: { step: 3, title: 'Approved & Cleared', desc: 'Commercial approval granted — ready to issue' },
    SENT: { step: 4, title: 'Presented to Client', desc: 'Quotation published on customer portal' },
    UNDER_NEGOTIATION: { step: 4, title: 'Active Negotiation', desc: 'Customer submitted counter-discount request' },
    CONFIRMED: { step: 5, title: 'Order Confirmed', desc: 'Customer accepted terms — order placed' },
    FULFILLING: { step: 6, title: 'Fulfillment & Dispatch', desc: 'Multi-warehouse stock allocated & shipping' },
    COMPLETED: { step: 6, title: 'Closed & Invoiced', desc: 'Commercial invoice paid & deal completed' },
    REJECTED: { step: 1, title: 'Declined', desc: 'Deal closed without agreement' },
  };

  const currentStageInfo = stageMap[quote.status] || { step: 1, title: quote.status, desc: '' };
  const currentStep = currentStageInfo.step;

  const lifecycleStages = [
    { num: 1, label: 'Draft', sub: 'Pricing' },
    { num: 2, label: 'Approval', sub: 'Governance' },
    { num: 3, label: 'Approved', sub: 'Ready' },
    { num: 4, label: 'Negotiation', sub: 'Customer' },
    { num: 5, label: 'Confirmed', sub: 'Order' },
    { num: 6, label: 'Fulfill & Bill', sub: 'Executed' },
  ];

  const latestApprovalRequest =
    quote.approvalRequests && quote.approvalRequests.length > 0 ? quote.approvalRequests[0] : null;

  const pendingChangeRequests = (quote.changeRequests || []).filter((cr: any) => cr.status === 'PENDING');
  const hasAllocations = (quote.allocations || []).length > 0;
  const hasInvoices = (quote.invoices || []).length > 0;

  return (
    <div className="space-y-6">
      {/* ── Deal Header Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-ash p-5 rounded-2xl shadow-sm">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/quotations"
              className="p-1.5 text-graphite hover:text-onyx bg-fog hover:bg-fog/70 rounded-lg border border-ash transition-colors"
              title="Back to Quotations"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h2 className="text-xl font-extrabold text-onyx font-mono">{quote.quoteNumber}</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-brand-50 text-signal border border-brand-100">
              Rev v{quote.version}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase border ${
                quote.status === 'APPROVED' || quote.status === 'CONFIRMED' || quote.status === 'COMPLETED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : quote.status === 'PENDING_APPROVAL' || quote.status === 'UNDER_NEGOTIATION'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : quote.status === 'REVISION_REQUIRED' || quote.status === 'REJECTED'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-fog text-charcoal border-ash'
              }`}
            >
              {quote.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-graphite pt-0.5">
            <span className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-whisper" />
              Customer: <strong className="text-onyx">{quote.customer?.name}</strong>
              <span className="px-1.5 py-0.2 bg-fog rounded text-[10px] text-graphite font-mono border border-ash">
                {quote.customer?.tier} TIER
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-whisper" />
              Valid Until: <strong className="text-charcoal">{new Date(quote.validityDate).toLocaleDateString()}</strong>
            </span>
            {quote.owner && (
              <span className="text-[11px] text-whisper">
                Deal Owner: <span className="text-graphite font-medium">{quote.owner.name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Live Blended Risk & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <RiskBadge
            riskScore={quote.riskScore}
            riskBand={quote.riskBand}
            riskExplanationJson={quote.riskExplanation}
          />

          {canEdit && (quote.status === 'DRAFT' || quote.status === 'REVISION_REQUIRED') && (
            <button
              onClick={handleSubmitApproval}
              disabled={actionInProgress}
              className="btn-primary"
            >
              <CheckSquare className="w-4 h-4" />
              {quote.riskBand === 'LOW' ? 'Auto-Approve Deal' : 'Submit for Approval'}
            </button>
          )}

          {canEdit && quote.status === 'APPROVED' && (
            <button
              onClick={handleSendToCustomer}
              disabled={actionInProgress}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              Send to Customer Portal
            </button>
          )}
        </div>
      </div>

      {/* ── Deal Lifecycle Stepper ──────────────────────────────────────────── */}
      <div className="bg-white border border-ash rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider font-bold text-graphite flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-signal" />
            Deal Flow Progression: <span className="text-onyx">{currentStageInfo.title}</span>
          </span>
          <span className="text-xs text-graphite font-medium">{currentStageInfo.desc}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {lifecycleStages.map((stage) => {
            const isCompleted = currentStep > stage.num;
            const isCurrent = currentStep === stage.num;

            return (
              <div
                key={stage.num}
                className={`p-2.5 rounded-xl border transition-all flex items-center gap-2.5 ${
                  isCurrent
                    ? 'bg-emerald-50 border-signal/40 ring-2 ring-signal/15'
                    : isCompleted
                    ? 'bg-fog/60 border-emerald-200 text-charcoal'
                    : 'bg-white border-ash/80 text-whisper opacity-70'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCurrent
                      ? 'bg-signal text-white'
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-fog text-whisper'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : stage.num}
                </div>
                <div className="truncate">
                  <p className={`text-xs font-bold truncate ${isCurrent ? 'text-onyx' : 'text-charcoal'}`}>
                    {stage.label}
                  </p>
                  <p className="text-[10px] text-graphite truncate">{stage.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Customer Negotiation Banner (Counter-Discounts) ─────────────────── */}
      {pendingChangeRequests.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600 animate-bounce" />
              <h3 className="text-sm font-bold text-amber-950">Active Customer Counter-Discount Request</h3>
            </div>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900">
              Customer Negotiation In Progress
            </span>
          </div>

          <div className="space-y-2.5">
            {pendingChangeRequests.map((cr: any) => {
              const matchedLine = quote.lines?.find((l: any) => l.id === cr.lineId || l.id === cr.quotationLineId);
              return (
                <div
                  key={cr.id}
                  className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-onyx">
                      Item: <span className="font-bold text-signal">{matchedLine?.product?.name || 'Commercial Item'}</span>
                    </p>
                    <p className="text-graphite flex items-center gap-1.5 flex-wrap">
                      <span>Original Discount:</span>
                      <span className="font-mono font-bold text-charcoal">{matchedLine?.discountPercent ?? 0}%</span>
                      <span className="font-bold text-onyx">→</span>
                      <span>Requested Counter-Discount:</span>
                      <span className="font-mono font-bold text-amber-600 text-sm">{cr.requestedDiscountPercent}%</span>
                    </p>
                    {cr.notes && (
                      <p className="text-[11px] text-graphite italic bg-fog p-2 rounded border border-ash/60 mt-1">
                        "{cr.notes}"
                      </p>
                    )}
                  </div>

                  {canEdit && (
                    <button
                      onClick={() => handleAcceptCounterProposal(cr.id)}
                      disabled={actionInProgress}
                      className="btn-primary self-start sm:self-auto bg-amber-600 hover:bg-amber-500 shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Accept Counter-Offer
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Approval Tracker Workflow Banner ─────────────────────────────────── */}
      {latestApprovalRequest && (
        <ApprovalTracker
          steps={latestApprovalRequest.steps}
          currentStepIndex={latestApprovalRequest.currentStepIndex}
          requestStatus={latestApprovalRequest.status}
        />
      )}

      {/* ── Main Builder Layout: Left 2 Cols, Right Col Upsells ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quotation Products Table & Line Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add Product Line Controls */}
          {canEdit && (quote.status === 'DRAFT' || quote.status === 'REVISION_REQUIRED') ? (
            <div className="bg-white border border-ash rounded-2xl p-4 space-y-3 shadow-sm">
              <h3 className="text-xs uppercase font-bold text-graphite tracking-wider flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-signal" />
                Add Product or Service to Quotation
              </h3>
              <form onSubmit={handleAddLine} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-graphite">Product & SKU</label>
                  <select
                    value={addingProductId}
                    onChange={(e) => setAddingProductId(e.target.value)}
                    className="input"
                  >
                    {products.map((p) => {
                      const avail = (p.inventoryItems || []).reduce((s: number, it: any) => s + Math.max(0, (it.quantityOnHand || 0) - (it.quantityReserved || 0)), 0);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{p.basePrice} {p.unit}) — Stock: {avail} avail
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-graphite">Quantity</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Qty"
                    value={addingQuantity}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      setAddError(null);
                      setAddingQuantity(e.target.value.replace(/[^0-9]/g, ''));
                    }}
                    onBlur={() => {
                      if (!addingQuantity || parseInt(addingQuantity, 10) < 1) {
                        setAddingQuantity('1');
                      }
                    }}
                    className="input font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-graphite flex items-center justify-between">
                    <span>Discount %</span>
                    {addingProductId && (() => {
                      const sp = products.find((p) => p.id === addingProductId);
                      const ceiling = sp?.category?.discountCeilingPercent;
                      return ceiling ? (
                        <span className="text-[9px] text-whisper font-mono">Max: {ceiling}%</span>
                      ) : null;
                    })()}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={addingDiscount}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => {
                        setAddError(null);
                        const raw = e.target.value;
                        if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                          const val = parseFloat(raw);
                          if (raw === '' || isNaN(val) || (val >= 0 && val <= 100)) {
                            setAddingDiscount(raw);
                          }
                        }
                      }}
                      onBlur={() => {
                        if (addingDiscount === '') setAddingDiscount('0');
                      }}
                      className="input pr-7 font-bold text-amber-600 font-mono"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-graphite pointer-events-none">
                      %
                    </span>
                  </div>
                </div>
                <button type="submit" className="btn-primary justify-center h-[38px]">
                  <Plus className="w-3.5 h-3.5" />
                  Add Line
                </button>

                {/* Selected Product Live Warehouse Stock Breakdown */}
                {(() => {
                  const selectedProduct = products.find((p) => p.id === addingProductId);
                  if (!selectedProduct || !selectedProduct.inventoryItems || selectedProduct.inventoryItems.length === 0) return null;
                  const totalOnHand = selectedProduct.inventoryItems.reduce((s: number, it: any) => s + (it.quantityOnHand || 0), 0);
                  const totalAvail = selectedProduct.inventoryItems.reduce((s: number, it: any) => s + Math.max(0, (it.quantityOnHand || 0) - (it.quantityReserved || 0)), 0);
                  return (
                    <div className="sm:col-span-4 bg-fog border border-ash rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Warehouse className="w-3.5 h-3.5 text-signal" />
                        <span className="font-semibold text-onyx">Live Warehouse Stock:</span>
                        <span className="text-graphite">
                          Total on-hand: <strong className="text-onyx">{totalOnHand}</strong> | Available to promise:{' '}
                          <strong className={totalAvail > 0 ? 'text-emerald-700' : 'text-rose-600'}>{totalAvail} units</strong>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {selectedProduct.inventoryItems.map((inv: any) => {
                          const avail = Math.max(0, (inv.quantityOnHand || 0) - (inv.quantityReserved || 0));
                          return (
                            <span
                              key={inv.id}
                              className="px-2 py-0.5 rounded bg-white border border-ash text-[10px] font-mono flex items-center gap-1"
                            >
                              <span className="font-bold text-graphite">{inv.warehouse?.code || 'WH'}:</span>
                              <span className="text-onyx">{inv.quantityOnHand} on-hand</span>
                              <span className={`font-semibold ${avail > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                ({avail} avail)
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </form>
              {addError && (
                <div className="flex items-center gap-2 text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {addError}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-fog border border-ash rounded-xl p-3.5 text-xs text-graphite flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Info className="w-4 h-4 text-whisper shrink-0" />
                {quote.status === 'APPROVED' || quote.status === 'CONFIRMED' || quote.status === 'FULFILLING'
                  ? 'Quotation terms are locked following commercial approval/order confirmation.'
                  : 'Read-only view for current status.'}
              </span>
              {(quote.status === 'SENT' || quote.status === 'UNDER_NEGOTIATION') && (
                <Link
                  to="/customer-portal"
                  className="text-xs font-semibold text-signal hover:underline flex items-center gap-1"
                >
                  Customer Negotiation Portal <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          )}

          {/* Quotation Lines Table */}
          <div className="bg-white border border-ash rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-fog text-charcoal uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="p-3.5">Product & SKU</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Qty</th>
                    <th className="p-3.5">Unit Price</th>
                    <th className="p-3.5">Discount Given</th>
                    <th className="p-3.5">Ceiling Status</th>
                    <th className="p-3.5">Net Total</th>
                    <th className="p-3.5">Margin %</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ash text-charcoal">
                  {quote.lines?.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-whisper">
                        No product lines in quotation. Use control panel above or click an upsell recommendation on the
                        right.
                      </td>
                    </tr>
                  ) : (
                    quote.lines?.map((line: any) => {
                      const isOver = line.overagePoints > 0;
                      return (
                        <tr key={line.id} className="hover:bg-fog/70 transition-colors">
                          <td className="p-3.5 font-semibold text-onyx">
                            <div>
                              <p className="font-bold">{line.product?.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-whisper font-mono">{line.product?.sku}</span>
                                {line.isRecurring && (
                                  <span className="text-[10px] text-signal bg-brand-50 border border-brand-100 px-1.5 py-0.2 rounded font-semibold">
                                    Recurring ({line.billingCycle || 'MONTHLY'})
                                  </span>
                                )}
                              </div>
                              {line.product?.inventoryItems && line.product.inventoryItems.length > 0 && (() => {
                                const items = line.product.inventoryItems;
                                const totalAvail = items.reduce((s: number, it: any) => s + Math.max(0, (it.quantityOnHand || 0) - (it.quantityReserved || 0)), 0);
                                const isShort = line.quantity > totalAvail;
                                return (
                                  <div className="mt-1.5 space-y-1">
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                      isShort
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}>
                                      <Warehouse className="w-2.5 h-2.5" />
                                      {isShort ? `Shortage: Need ${line.quantity - totalAvail} Backordered` : `In Stock: ${totalAvail} units avail`}
                                    </span>
                                    <div className="flex flex-wrap gap-1 text-[9px] text-graphite font-mono">
                                      {items.map((inv: any) => {
                                        const avail = Math.max(0, (inv.quantityOnHand || 0) - (inv.quantityReserved || 0));
                                        return (
                                          <span key={inv.id} className="bg-fog px-1 py-0.2 rounded border border-ash/60">
                                            {inv.warehouse?.code || 'WH'}: {inv.quantityOnHand} on-hand ({avail} avail)
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="p-3.5 text-graphite">{line.product?.category?.name}</td>
                          <td className="p-3.5">
                            {canEdit && (quote.status === 'DRAFT' || quote.status === 'REVISION_REQUIRED') ? (
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={lineQtyDrafts[line.id] !== undefined ? lineQtyDrafts[line.id] : String(line.quantity)}
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/[^0-9]/g, '');
                                  setLineQtyDrafts(prev => ({ ...prev, [line.id]: clean }));
                                }}
                                onBlur={() => {
                                  const draft = lineQtyDrafts[line.id];
                                  if (draft !== undefined) {
                                    const parsed = parseInt(draft, 10);
                                    const finalQty = isNaN(parsed) || parsed < 1 ? 1 : parsed;
                                    setLineQtyDrafts(prev => {
                                      const next = { ...prev };
                                      delete next[line.id];
                                      return next;
                                    });
                                    if (finalQty !== line.quantity) {
                                      handleLineUpdate(line.id, finalQty, line.discountPercent);
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                }}
                                className="input w-16 text-center font-mono font-bold"
                              />
                            ) : (
                              <span className="font-mono font-semibold text-onyx">{line.quantity}</span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono">₹{line.unitPrice?.toFixed(2)}</td>
                          <td className="p-3.5">
                            {canEdit && (quote.status === 'DRAFT' || quote.status === 'REVISION_REQUIRED') ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={lineDiscountDrafts[line.id] !== undefined ? lineDiscountDrafts[line.id] : String(line.discountPercent)}
                                  onFocus={(e) => e.currentTarget.select()}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                                      setLineDiscountDrafts(prev => ({ ...prev, [line.id]: raw }));
                                    }
                                  }}
                                  onBlur={() => {
                                    const draft = lineDiscountDrafts[line.id];
                                    if (draft !== undefined) {
                                      const parsed = parseFloat(draft);
                                      const finalDisc = isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
                                      setLineDiscountDrafts(prev => {
                                        const next = { ...prev };
                                        delete next[line.id];
                                        return next;
                                      });
                                      if (finalDisc !== line.discountPercent) {
                                        handleLineUpdate(line.id, line.quantity, finalDisc);
                                      }
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                  }}
                                  className="input w-16 text-center font-bold text-amber-600 font-mono"
                                />
                                <span className="text-graphite font-semibold">%</span>
                              </div>
                            ) : (
                              <span className="font-mono font-semibold text-amber-600">{line.discountPercent}%</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  isOver
                                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {line.status}
                              </span>
                              <p className="text-[10px] text-whisper">Ceiling: {line.effectiveCeiling}%</p>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-onyx">₹{line.totalAmount?.toFixed(2)}</td>
                          <td className="p-3.5 font-mono font-semibold text-emerald-600">
                            {line.marginPercent?.toFixed(1)}% (₹{line.marginAmount?.toFixed(2)})
                          </td>
                          <td className="p-3.5 text-right">
                            {canEdit && (quote.status === 'DRAFT' || quote.status === 'REVISION_REQUIRED') && (
                              <button
                                onClick={() => handleRemoveLine(line.id)}
                                className="p-1.5 text-whisper hover:text-crimson hover:bg-fog rounded transition-colors"
                                title="Delete line"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Summary Bar */}
            <div className="bg-fog p-5 border-t border-ash grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-graphite uppercase font-medium text-[10px]">Gross Subtotal</p>
                <p className="text-onyx font-mono font-bold text-base mt-0.5">₹{quote.subtotal?.toFixed(2)}</p>
              </div>

              <div>
                <p className="text-graphite uppercase font-medium text-[10px]">Total Discount</p>
                <p className="text-amber-600 font-mono font-bold text-base mt-0.5">-₹{quote.totalDiscount?.toFixed(2)}</p>
              </div>

              <div>
                <p className="text-graphite uppercase font-medium text-[10px]">Net Total (Tax Incl.)</p>
                <p className="text-signal font-mono font-bold text-xl mt-0.5">₹{quote.netTotal?.toFixed(2)}</p>
              </div>

              <div>
                <p className="text-graphite uppercase font-medium text-[10px]">Total Margin</p>
                <p className="text-emerald-600 font-mono font-bold text-base mt-0.5">
                  ₹{quote.totalMargin?.toFixed(2)} ({quote.totalMarginPercent?.toFixed(1)}%)
                </p>
              </div>
            </div>
          </div>

          {/* ── Fulfillment Split Summary (if generated) ────────────────────── */}
          {hasAllocations && (
            <div className="bg-white border border-ash rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-ash pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-signal" />
                  <h3 className="text-sm font-bold text-onyx">Multi-Warehouse Fulfillment Allocations</h3>
                </div>
                <Link
                  to="/fulfillment"
                  className="text-xs text-signal font-semibold hover:underline flex items-center gap-1"
                >
                  Fulfillment Operations <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {quote.allocations.map((alloc: any) => (
                  <div key={alloc.id} className="p-3 bg-fog rounded-xl border border-ash space-y-1">
                    <p className="font-bold text-onyx">{alloc.warehouse?.name} ({alloc.warehouse?.code})</p>
                    <p className="text-graphite">
                      Allocated Quantity: <strong className="text-onyx">{alloc.allocatedQty} units</strong>
                    </p>
                    <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {alloc.status}
                    </span>
                  </div>
                ))}
              </div>

              {quote.backorders && quote.backorders.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Backorder Notice
                  </p>
                  <p>
                    {quote.backorders.map((b: any) => `${b.quantity}x ${b.product?.name}`).join(', ')} currently backordered.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Invoices Summary (if generated) ───────────────── */}
          {hasInvoices && (
            <div className="bg-white border border-ash rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-ash pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-signal" />
                  <h3 className="text-sm font-bold text-onyx">Commercial Invoices & Billing</h3>
                </div>
                <Link
                  to="/invoices"
                  className="text-xs text-signal font-semibold hover:underline flex items-center gap-1"
                >
                  Billing Console <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {quote.invoices?.map((inv: any) => (
                  <div key={inv.id} className="p-3 bg-fog rounded-xl border border-ash space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-signal">{inv.invoiceNumber}</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-graphite">
                      Net Total: <strong className="text-onyx font-mono">₹{inv.totalAmount?.toFixed(2)}</strong> (Net 30)
                    </p>
                    <p className="text-graphite">
                      Balance Due:{' '}
                      <strong className="text-charcoal font-mono">₹{inv.balanceAmount?.toFixed(2)}</strong>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Upsell Drawer & Deal Intelligence ─────────────────── */}
        <div className="space-y-6">
          {/* Upsell Drawer */}
          <div className="bg-white border border-ash rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-ash pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-onyx">Upsell & Cross-Sell Engine</h3>
              </div>
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                Live Margin Optimization
              </span>
            </div>

            {recommendations.length === 0 ? (
              <div className="p-6 text-center text-whisper text-xs space-y-2">
                <Info className="w-6 h-6 mx-auto text-graphite" />
                <p>No new upsell recommendations available for current cart configuration.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 bg-fog/70 border border-ash hover:border-signal/40 rounded-xl space-y-2.5 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-brand-50 text-signal border border-brand-100">
                          {rec.ruleType}
                        </span>
                        <h4 className="text-xs font-bold text-onyx mt-1.5">{rec.targetProduct?.name}</h4>
                        <p className="text-[11px] text-graphite leading-tight">{rec.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-ash">
                      <div>
                        <p className="text-emerald-600 font-bold font-mono">+₹{rec.marginDelta} Margin</p>
                        {rec.promotionDiscountPercent > 0 && (
                          <p className="text-amber-600 text-[10px] font-semibold">
                            {rec.promotionDiscountPercent}% Promo OFF
                          </p>
                        )}
                      </div>
                      {canEdit && (quote.status === 'DRAFT' || quote.status === 'REVISION_REQUIRED') && (
                        <button
                          onClick={() => handleAddRecommendation(rec.targetProduct.id, rec.promotionDiscountPercent)}
                          className="btn-primary text-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add to Quote
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deal Owner Checklist & Workflow Guide */}
          <div className="bg-white border border-ash rounded-2xl p-5 space-y-3 shadow-sm text-xs">
            <h4 className="font-bold text-onyx flex items-center gap-2 border-b border-ash pb-2">
              <ShieldCheck className="w-4 h-4 text-signal" />
              Deal Owner Guidance
            </h4>
            <div className="space-y-2 text-graphite leading-relaxed">
              <p className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  <strong>Ceiling Governance:</strong> Line discounts exceeding customer tier or product limits flag as{' '}
                  <span className="text-rose-600 font-bold">OVER</span> and increase the Blended Risk Score.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  <strong>Auto-Approval:</strong> Deals with <span className="text-emerald-600 font-bold">LOW</span> risk
                  are auto-approved immediately without waiting for managerial review.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  <strong>Counter-Offer Guard:</strong> When a customer proposes higher discounts in the portal,
                  accepting will automatically re-evaluate risk and retrigger approvals if policy is breached.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
