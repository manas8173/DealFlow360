import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getStoredUser } from '../api';
import { useToast } from '../components/Toast';
import {
  Inbox,
  FilePlus,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  User,
  Package,
  Layers,
  ArrowRight,
  Filter,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const QuoteRequestsList: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      setLoading(true);
      const data = await api.getQuoteRequests();
      setRequests(data || []);
    } catch (e: any) {
      toast.error('Failed to load quote requests: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleConsiderAndQuote = async (id: string) => {
    try {
      setProcessingId(id);
      const res = await api.acceptQuoteRequest(id);
      toast.success('Quote request accepted! Opening Quotation Builder...');
      if (res?.quoteId) {
        navigate(`/quotations/${res.quoteId}`);
      } else {
        await loadRequests();
      }
    } catch (e: any) {
      toast.error('Failed to accept request: ' + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this customer quote request?')) return;
    try {
      setProcessingId(id);
      await api.rejectQuoteRequest(id);
      toast.info('Quote request marked as rejected');
      await loadRequests();
    } catch (e: any) {
      toast.error('Failed to reject request: ' + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const acceptedCount = requests.filter((r) => r.status === 'ACCEPTED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-ash p-6 rounded-cards shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 border border-violet-200 text-violet-700 rounded-full text-xs font-semibold mb-2">
            <Inbox className="w-3.5 h-3.5 text-violet-600" />
            Inbound Portal Inquiries
          </div>
          <h1 className="text-2xl font-extrabold text-onyx tracking-tight">Customer Quote Requests</h1>
          <p className="text-xs text-graphite mt-1">
            Review incoming quote requests from clients, evaluate requirements, and convert into draft quotations in a single click.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="refresh-quote-requests-btn"
            onClick={loadRequests}
            disabled={loading}
            className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setFilter('ALL')}
          className={`bg-white border rounded-cards p-4 cursor-pointer transition-all ${
            filter === 'ALL' ? 'border-brand-500 ring-2 ring-brand-100 shadow-sm' : 'border-ash hover:border-graphite/30'
          }`}
        >
          <div className="flex items-center justify-between text-graphite text-xs">
            <span className="font-semibold">All Inquiries</span>
            <Layers className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-extrabold text-onyx mt-2">{totalCount}</div>
          <p className="text-[11px] text-whisper mt-1">Total customer submissions</p>
        </div>

        <div
          onClick={() => setFilter('PENDING')}
          className={`bg-white border rounded-cards p-4 cursor-pointer transition-all ${
            filter === 'PENDING' ? 'border-amber-500 ring-2 ring-amber-100 shadow-sm' : 'border-ash hover:border-graphite/30'
          }`}
        >
          <div className="flex items-center justify-between text-graphite text-xs">
            <span className="font-semibold">Pending Consideration</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-2">{pendingCount}</div>
          <p className="text-[11px] text-whisper mt-1">Awaiting sales review</p>
        </div>

        <div
          onClick={() => setFilter('ACCEPTED')}
          className={`bg-white border rounded-cards p-4 cursor-pointer transition-all ${
            filter === 'ACCEPTED' ? 'border-emerald-500 ring-2 ring-emerald-100 shadow-sm' : 'border-ash hover:border-graphite/30'
          }`}
        >
          <div className="flex items-center justify-between text-graphite text-xs">
            <span className="font-semibold">Quoted (Accepted)</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">{acceptedCount}</div>
          <p className="text-[11px] text-whisper mt-1">Converted to quotations</p>
        </div>

        <div
          onClick={() => setFilter('REJECTED')}
          className={`bg-white border rounded-cards p-4 cursor-pointer transition-all ${
            filter === 'REJECTED' ? 'border-rose-500 ring-2 ring-rose-100 shadow-sm' : 'border-ash hover:border-graphite/30'
          }`}
        >
          <div className="flex items-center justify-between text-graphite text-xs">
            <span className="font-semibold">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2">{rejectedCount}</div>
          <p className="text-[11px] text-whisper mt-1">Declined requests</p>
        </div>
      </div>

      {/* Main List Table */}
      <div className="bg-white border border-ash rounded-cards overflow-hidden shadow-sm">
        {/* Table Filters Header */}
        <div className="px-6 py-4 border-b border-ash flex items-center justify-between bg-fog/30">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-graphite" />
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal">Filter Requests:</span>
            <div className="flex items-center gap-1.5 ml-2">
              {(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    filter === f
                      ? 'bg-onyx text-white shadow-sm'
                      : 'bg-fog text-charcoal hover:bg-ash/50 border border-ash'
                  }`}
                >
                  {f === 'ALL' ? 'All' : f === 'PENDING' ? 'Pending' : f === 'ACCEPTED' ? 'Quoted' : 'Rejected'}
                </button>
              ))}
            </div>
          </div>
          <span className="text-xs text-graphite">
            Showing {filteredRequests.length} of {requests.length} requests
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-whisper flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
            <span>Loading customer quote requests...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-fog rounded-full flex items-center justify-center mx-auto text-whisper">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-onyx">No quote requests found</h3>
            <p className="text-xs text-graphite max-w-sm mx-auto">
              {filter === 'ALL'
                ? 'When customers request quotes from their portal, they will appear here assigned to you.'
                : `No requests with status "${filter}".`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ash">
            {filteredRequests.map((req) => {
              const isProcessing = processingId === req.id;
              return (
                <div
                  key={req.id}
                  className="p-6 hover:bg-fog/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-3 flex-1">
                    {/* Top Row: Customer Info & Status */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 font-bold text-onyx text-sm">
                        <Building className="w-4 h-4 text-violet-600" />
                        <span>{req.customer?.name}</span>
                        <span className="text-xs font-normal text-graphite">({req.customer?.company})</span>
                      </div>

                      {req.customer?.tier && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                          {req.customer.tier} TIER
                        </span>
                      )}

                      <span
                        className={`text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full border ${
                          req.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                            : req.status === 'ACCEPTED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {req.status === 'ACCEPTED' ? 'QUOTED' : req.status}
                      </span>

                      <span className="text-xs text-whisper ml-auto lg:ml-0">
                        {new Date(req.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Middle: Product & Quantity */}
                    {req.product ? (
                      <div className="flex items-center gap-3 bg-fog/80 p-3 rounded-xl border border-ash text-xs">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700 font-bold shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-onyx truncate">{req.product.name}</div>
                          <div className="text-[11px] text-graphite font-mono">
                            SKU: {req.product.sku} | Base: ₹{req.product.basePrice?.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-onyx">Qty: {req.quantity}</div>
                          <div className="text-[11px] text-violet-600 font-semibold font-mono">
                            Est: ₹{((req.product.basePrice || 0) * (req.quantity || 1)).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-graphite italic bg-fog/50 p-2.5 rounded-lg border border-ash/60">
                        General quotation request (no specific SKU selected)
                      </div>
                    )}

                    {/* Customer Notes */}
                    {req.notes && (
                      <div className="text-xs bg-white p-3 rounded-xl border border-ash/80 text-charcoal">
                        <span className="font-semibold text-onyx">Customer Requirements / Note: </span>
                        {req.notes}
                      </div>
                    )}

                    {/* Footer: Sales Rep attribution */}
                    <div className="flex items-center gap-2 text-[11px] text-graphite">
                      <User className="w-3.5 h-3.5 text-whisper" />
                      <span>Assigned Rep: <strong className="text-charcoal">{req.salesRep?.name}</strong> ({req.salesRep?.email})</span>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                    {req.status === 'PENDING' ? (
                      <>
                        <button
                          id={`reject-req-${req.id}`}
                          onClick={() => handleReject(req.id)}
                          disabled={isProcessing}
                          className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all disabled:opacity-50"
                        >
                          Reject
                        </button>

                        <button
                          id={`consider-req-${req.id}`}
                          onClick={() => handleConsiderAndQuote(req.id)}
                          disabled={isProcessing}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Creating Quote...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Consider & Quote</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </>
                    ) : req.status === 'ACCEPTED' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-semibold">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        Quotation Generated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 font-semibold">
                        <XCircle className="w-4 h-4 text-rose-500" />
                        Declined
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
