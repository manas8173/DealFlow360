import React, { useEffect, useState } from 'react';
import { api, getStoredUser } from '../api';
import { useToast } from '../components/Toast';
import {
  Sparkles,
  MessageSquare,
  CheckCircle2,
  Building,
  FileText,
  AlertCircle,
  PlusCircle,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Package,
  Layers,
  Send,
  RefreshCw,
} from 'lucide-react';

export const CustomerPortal: React.FC = () => {
  const toast = useToast();
  const currentUser = getStoredUser();

  // Tab state
  const [activeTab, setActiveTab] = useState<'QUOTATIONS' | 'REQUESTS'>('QUOTATIONS');

  // Quotations state
  const [quotations, setQuotations] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Quote Requests state
  const [quoteRequests, setQuoteRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [salesReps, setSalesReps] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // New Request form state
  const [reqSalesRepId, setReqSalesRepId] = useState('');
  const [reqProductId, setReqProductId] = useState('');
  const [reqQuantity, setReqQuantity] = useState<string>('1');
  const [reqNotes, setReqNotes] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Negotiation Modal state
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [targetLineId, setTargetLineId] = useState('');
  const [counterDiscount, setCounterDiscount] = useState<string>('15');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPortalData();
    loadQuoteRequestsData();
  }, []);

  async function loadPortalData() {
    try {
      setLoading(true);
      const data = await api.getPortalQuotations();
      setQuotations(data || []);
      if (data && data.length > 0 && !selectedQuote) {
        const qDetail = await api.getPortalQuotation(data[0].id);
        setSelectedQuote(qDetail);
      }
    } catch (e: any) {
      console.error('Failed to load portal quotations:', e);
      toast.error('Failed to load portal quotations: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadQuoteRequestsData() {
    try {
      const [repsData, prodsData, reqsData] = await Promise.all([
        api.getSalesReps().catch(() => []),
        api.getPortalProducts().catch(() => []),
        api.getCustomerQuoteRequests().catch(() => []),
      ]);

      setSalesReps(repsData || []);
      setProducts(prodsData || []);
      setQuoteRequests(reqsData || []);
      if (reqsData && reqsData.length > 0 && !selectedRequest) {
        setSelectedRequest(reqsData[0]);
      }
      if (repsData && repsData.length > 0 && !reqSalesRepId) {
        setReqSalesRepId(repsData[0].id);
      }
    } catch (e: any) {
      console.error('Failed to load quote requests data:', e);
    }
  }

  const handleSelectQuote = async (id: string) => {
    try {
      const qDetail = await api.getPortalQuotation(id);
      setSelectedQuote(qDetail);
    } catch (e: any) {
      toast.error('Failed to load quotation: ' + e.message);
    }
  };

  const handleOpenCounterModal = (line: any) => {
    setTargetLineId(line.id);
    setCounterDiscount(String(Math.min(100, (line.discountPercent || 0) + 5)));
    setNotes('');
    setShowNegotiationModal(true);
  };

  const handleSubmitCounterDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuote) return;

    try {
      setProcessing(true);
      const disc = parseFloat(counterDiscount);
      const validDisc = isNaN(disc) ? 0 : Math.min(100, Math.max(0, disc));
      await api.submitCounterDiscount(selectedQuote.id, {
        lineId: targetLineId,
        requestedDiscountPercent: validDisc,
        notes,
      });

      toast.success('Counter discount proposal submitted to sales desk! Status updated to UNDER_NEGOTIATION.');
      setShowNegotiationModal(false);
      handleSelectQuote(selectedQuote.id);
    } catch (e: any) {
      toast.error('Failed to submit counter discount: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleInternalAcceptChangeRequest = async (changeRequestId: string) => {
    try {
      const res = await api.acceptChangeRequest(changeRequestId);
      if (res.reApprovalTriggered) {
        toast.warning(
          'Change accepted! Recalculated terms exceed policy threshold — Quote has automatically returned to PENDING_APPROVAL for managerial review.'
        );
      } else {
        toast.success('Change accepted and applied to quotation!');
      }
      handleSelectQuote(selectedQuote.id);
    } catch (e: any) {
      toast.error('Acceptance error: ' + e.message);
    }
  };

  const handleConfirmQuote = async () => {
    if (!selectedQuote) return;

    try {
      await api.confirmPortalQuotation(selectedQuote.id);
      toast.success('Quotation confirmed! Billing invoice and fulfillment orders generated.');
      handleSelectQuote(selectedQuote.id);
    } catch (e: any) {
      toast.error('Confirmation failed: ' + e.message);
    }
  };

  const handleOpenRequestModal = () => {
    if (salesReps.length > 0 && !reqSalesRepId) {
      setReqSalesRepId(salesReps[0].id);
    }
    setShowRequestModal(true);
  };

  const handleSubmitQuoteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqSalesRepId) {
      toast.error('Please select a sales representative');
      return;
    }

    try {
      setSubmittingRequest(true);
      const parsedQty = parseInt(reqQuantity, 10);
      const validQty = isNaN(parsedQty) || parsedQty < 1 ? 1 : parsedQty;
      const newReq = await api.submitQuoteRequest({
        salesRepId: reqSalesRepId,
        productId: reqProductId || undefined,
        quantity: validQty,
        notes: reqNotes || undefined,
      });

      toast.success('Your quote request has been submitted! Your chosen Sales Representative has been notified.');
      setShowRequestModal(false);
      setReqNotes('');
      setReqProductId('');
      setReqQuantity('1');

      // Refresh requests and switch to requests tab
      const updatedReqs = await api.getCustomerQuoteRequests();
      setQuoteRequests(updatedReqs || []);
      setSelectedRequest(newReq || updatedReqs?.[0]);
      setActiveTab('REQUESTS');
    } catch (e: any) {
      toast.error('Failed to submit quote request: ' + e.message);
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Customer Portal Top Banner */}
      <div className="bg-white border border-ash p-6 rounded-cards shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 border border-violet-200 text-violet-700 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            Customer Negotiation & Ordering Portal
          </div>
          <h1 className="text-2xl font-extrabold text-onyx tracking-tight">Enterprise Quote Collaboration Desk</h1>
          <p className="text-xs text-graphite">
            Request product quotes from preferred sales representatives, review commercial terms, negotiate discounts, and confirm orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-fog px-3 py-2 rounded-xl border border-ash text-xs text-charcoal">
            <Building className="w-4 h-4 text-violet-600" />
            <span>Customer Account: <strong className="text-onyx">{currentUser?.name}</strong></span>
          </div>

          <button
            id="request-quote-open-modal-btn"
            onClick={handleOpenRequestModal}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Request a Quote
          </button>
        </div>
      </div>

      {/* Tabs: Quotations vs Quote Requests */}
      <div className="flex items-center gap-3 border-b border-ash pb-3">
        <button
          id="tab-quotations-btn"
          onClick={() => setActiveTab('QUOTATIONS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'QUOTATIONS'
              ? 'bg-onyx text-white shadow-sm'
              : 'bg-fog text-charcoal hover:bg-ash/50 border border-ash'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Active Quotations</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'QUOTATIONS' ? 'bg-white/20 text-white' : 'bg-ash text-charcoal'}`}>
            {quotations.length}
          </span>
        </button>

        <button
          id="tab-requests-btn"
          onClick={() => setActiveTab('REQUESTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'REQUESTS'
              ? 'bg-onyx text-white shadow-sm'
              : 'bg-fog text-charcoal hover:bg-ash/50 border border-ash'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>My Quote Requests</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'REQUESTS' ? 'bg-white/20 text-white' : 'bg-ash text-charcoal'}`}>
            {quoteRequests.length}
          </span>
        </button>
      </div>

      {/* TAB 1: COMMERCIAL QUOTATIONS */}
      {activeTab === 'QUOTATIONS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Quotation Selector */}
          <div className="bg-white border border-ash rounded-cards p-4 space-y-3 shadow-sm">
            <h3 className="text-xs uppercase font-bold text-charcoal tracking-wider">My Commercial Quotations</h3>
            {loading ? (
              <p className="text-xs text-whisper py-6 text-center">Loading portal quotes...</p>
            ) : quotations.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-xs text-whisper">No active quotations yet.</p>
                <button
                  onClick={handleOpenRequestModal}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  Request Your First Quote
                </button>
              </div>
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
                Select a quotation from the list on the left to review details and negotiate terms.
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
                    <p className="text-xs text-graphite mt-1">
                      Valid Until: {selectedQuote.validityDate ? new Date(selectedQuote.validityDate).toLocaleDateString() : '30 Days'}
                    </p>
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
                      <span className="text-[10px] bg-violet-100 px-2 py-0.5 rounded text-violet-700 font-bold border border-violet-200">
                        Action Required
                      </span>
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
                    <tbody className="divide-y divide-ash">
                      {selectedQuote.lines?.map((line: any) => (
                        <tr key={line.id} className="hover:bg-fog/50">
                          <td className="p-3.5 font-medium text-onyx">
                            <div>{line.product?.name}</div>
                            <div className="text-[10px] text-graphite font-mono">SKU: {line.product?.sku}</div>
                          </td>
                          <td className="p-3.5 font-mono">{line.quantity}</td>
                          <td className="p-3.5 font-mono">₹{line.unitPrice?.toFixed(2)}</td>
                          <td className="p-3.5 font-mono text-emerald-600 font-bold">{line.discountPercent}%</td>
                          <td className="p-3.5 font-mono font-bold text-onyx">₹{line.lineTotal?.toFixed(2)}</td>
                          <td className="p-3.5 text-right">
                            {selectedQuote.status !== 'CONFIRMED' && (
                              <button
                                onClick={() => handleOpenCounterModal(line)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors"
                              >
                                Propose Counter Discount
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Financial Summary */}
                  <div className="p-4 bg-fog border-t border-ash flex justify-end">
                    <div className="w-64 space-y-1.5 text-xs">
                      <div className="flex justify-between text-graphite">
                        <span>Subtotal:</span>
                        <span className="font-mono">₹{selectedQuote.subtotal?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>Total Discount:</span>
                        <span className="font-mono">-₹{selectedQuote.totalDiscount?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-graphite">
                        <span>Tax:</span>
                        <span className="font-mono">+₹{selectedQuote.totalTax?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-extrabold text-onyx pt-2 border-t border-ash">
                        <span>Net Payable:</span>
                        <span className="font-mono text-violet-600">₹{selectedQuote.netTotal?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Negotiation Thread */}
                <div className="bg-white border border-ash rounded-cards p-4 space-y-3 shadow-sm">
                  <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-violet-600" />
                    Deal Negotiation History
                  </h4>
                  <div className="space-y-2">
                    {!selectedQuote.negotiationThread?.messages || selectedQuote.negotiationThread.messages.length === 0 ? (
                      <p className="text-xs text-whisper italic">No negotiation messages exchanged yet.</p>
                    ) : (
                      selectedQuote.negotiationThread.messages.map((msg: any) => (
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
      )}

      {/* TAB 2: MY QUOTE REQUESTS */}
      {activeTab === 'REQUESTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Requests List */}
          <div className="bg-white border border-ash rounded-cards p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase font-bold text-charcoal tracking-wider">Submitted Requests</h3>
              <button
                onClick={handleOpenRequestModal}
                className="text-[11px] font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                New Request
              </button>
            </div>

            {quoteRequests.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <Clock className="w-8 h-8 text-whisper mx-auto" />
                <p className="text-xs text-whisper">You have not submitted any quote requests yet.</p>
                <button
                  onClick={handleOpenRequestModal}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  Request a Quote
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {quoteRequests.map((r) => {
                  const isSelected = selectedRequest?.id === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRequest(r)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-violet-50 border-violet-200 shadow-sm'
                          : 'bg-fog/70 border-ash hover:border-ash'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-onyx text-xs truncate max-w-[140px]">
                          {r.product ? r.product.name : 'General Quote'}
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase border ${
                            r.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : r.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {r.status === 'ACCEPTED' ? 'QUOTED' : r.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-graphite mt-1 flex items-center justify-between">
                        <span>Rep: {r.salesRep?.name}</span>
                        <span className="text-[10px] text-whisper font-mono">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right 2 Columns: Request Details */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedRequest ? (
              <div className="bg-white border border-ash rounded-cards p-12 text-center text-whisper shadow-sm">
                Select a quote request from the left to view details and status.
              </div>
            ) : (
              <div className="bg-white border border-ash rounded-cards p-6 space-y-6 shadow-sm">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ash pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-extrabold text-onyx">
                        {selectedRequest.product ? selectedRequest.product.name : 'Custom Commercial Inquiry'}
                      </h3>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase border ${
                          selectedRequest.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                            : selectedRequest.status === 'ACCEPTED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {selectedRequest.status === 'ACCEPTED' ? 'QUOTED (ACCEPTED)' : selectedRequest.status}
                      </span>
                    </div>
                    <p className="text-xs text-graphite mt-1">
                      Submitted on {new Date(selectedRequest.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-fog px-3 py-1.5 rounded-xl border border-ash text-xs">
                    <User className="w-4 h-4 text-violet-600" />
                    <div>
                      <span className="text-whisper text-[10px] block">Assigned Representative</span>
                      <strong className="text-onyx">{selectedRequest.salesRep?.name}</strong>
                    </div>
                  </div>
                </div>

                {/* Status Explanation Card */}
                {selectedRequest.status === 'PENDING' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <strong className="text-amber-900 block font-bold">Awaiting Sales Representative Review</strong>
                      <p className="text-amber-800">
                        {selectedRequest.salesRep?.name} is reviewing your requirements. Once considered, an official commercial quotation will be created and appear under your Active Quotations tab.
                      </p>
                    </div>
                  </div>
                )}

                {selectedRequest.status === 'ACCEPTED' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <strong className="text-emerald-900 block font-bold">Quote Prepared by Sales Desk!</strong>
                      <p className="text-emerald-800">
                        Your sales representative has accepted your request and prepared a commercial quotation. Switch to the <strong>Active Quotations</strong> tab above to review discount terms and confirm.
                      </p>
                    </div>
                  </div>
                )}

                {selectedRequest.status === 'REJECTED' && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <strong className="text-rose-900 block font-bold">Request Declined</strong>
                      <p className="text-rose-800">
                        This inquiry could not be fulfilled at this time. Please contact your sales representative directly or submit a revised request.
                      </p>
                    </div>
                  </div>
                )}

                {/* Requested Product Details */}
                {selectedRequest.product && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">Product Specifications</h4>
                    <div className="bg-fog/80 p-4 rounded-xl border border-ash flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700 font-bold shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-onyx text-sm">{selectedRequest.product.name}</div>
                          <div className="text-graphite font-mono text-[11px]">
                            SKU: {selectedRequest.product.sku} | Unit Price: ₹{selectedRequest.product.basePrice?.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-onyx">Quantity: {selectedRequest.quantity}</div>
                        <div className="text-violet-600 font-bold font-mono">
                          Est. Total: ₹{((selectedRequest.product.basePrice || 0) * (selectedRequest.quantity || 1)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Notes */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">Your Notes & Requirements</h4>
                  <div className="bg-white p-4 rounded-xl border border-ash text-xs text-onyx">
                    {selectedRequest.notes || <span className="text-whisper italic">No additional notes provided.</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Request a Quote Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-ash rounded-cards max-w-lg w-full p-6 space-y-4 shadow-floating">
            <div className="flex items-center justify-between border-b border-ash pb-3">
              <div>
                <h3 className="text-lg font-bold text-onyx">Request a Product Quotation</h3>
                <p className="text-xs text-graphite">Select your preferred sales representative and desired product.</p>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-whisper hover:text-onyx text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitQuoteRequest} className="space-y-4">
              {/* Sales Rep Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-violet-600" />
                  Choose Sales Representative <span className="text-rose-500">*</span>
                </label>
                <select
                  id="request-sales-rep-select"
                  value={reqSalesRepId}
                  onChange={(e) => setReqSalesRepId(e.target.value)}
                  className="input w-full text-xs"
                  required
                >
                  {salesReps.length === 0 ? (
                    <option value="">No sales reps available</option>
                  ) : (
                    salesReps.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name} ({rep.email}) - {rep.role}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Product Selector (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-violet-600" />
                  Select Product (Optional)
                </label>
                <select
                  id="request-product-select"
                  value={reqProductId}
                  onChange={(e) => setReqProductId(e.target.value)}
                  className="input w-full text-xs"
                >
                  <option value="">-- General Quote / Custom Inquiry --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - ₹{p.basePrice?.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Quantity</label>
                <input
                  id="request-quantity-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={reqQuantity}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setReqQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={() => {
                    if (!reqQuantity || parseInt(reqQuantity, 10) < 1) {
                      setReqQuantity('1');
                    }
                  }}
                  className="input w-full text-xs font-mono font-bold"
                  required
                />
              </div>

              {/* Requirements & Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Requirements & Delivery Notes</label>
                <textarea
                  id="request-notes-input"
                  rows={3}
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="e.g. Inquiring for 50 units for next month delivery, requesting volume terms..."
                  className="input w-full p-2.5 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-ash">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="btn-ghost px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  id="submit-quote-request-btn"
                  type="submit"
                  disabled={submittingRequest || !reqSalesRepId}
                  className="btn-primary px-5 py-2 text-xs flex items-center gap-2"
                >
                  {submittingRequest ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Submit Quote Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  type="text"
                  inputMode="decimal"
                  value={counterDiscount}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                      const val = parseFloat(raw);
                      if (raw === '' || isNaN(val) || (val >= 0 && val <= 100)) {
                        setCounterDiscount(raw);
                      }
                    }
                  }}
                  onBlur={() => {
                    if (counterDiscount === '') setCounterDiscount('0');
                  }}
                  className="input w-full text-sm font-mono font-bold text-amber-600 font-mono"
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
