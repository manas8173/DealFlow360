import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getStoredUser } from '../api';
import { RiskBadge } from '../components/RiskBadge';
import { useToast } from '../components/Toast';
import { FileText, Plus, Search, Filter, ArrowRight, Building, ShieldAlert, Sparkles } from 'lucide-react';

export const QuotationsList: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState('');
  const [initialProductId, setInitialProductId] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('1');
  const [initialDiscount, setInitialDiscount] = useState('0');

  const role = getStoredUser()?.role;
  const canCreateQuotation = role === 'SALES_REP' || role === 'ADMIN';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [qData, cData, pData] = await Promise.all([
        api.getQuotations(),
        api.getCustomers().catch(() => []),
        api.getProducts().catch(() => []),
      ]);
      setQuotations(qData || []);
      setCustomers(cData || []);
      setProducts(pData || []);
      if (cData && cData.length > 0) setNewCustomerId(cData[0].id);
    } catch (e) {
      console.error('Failed to load quotations:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerId) return;
    try {
      const payload: any = { customerId: newCustomerId };
      if (initialProductId) {
        payload.initialItem = {
          productId: initialProductId,
          quantity: parseInt(initialQuantity, 10) || 1,
          discountPercent: parseFloat(initialDiscount) || 0,
        };
      }
      const created = await api.createQuotation(payload);
      setShowCreateModal(false);
      setInitialProductId('');
      setInitialQuantity('1');
      setInitialDiscount('0');
      toast.success(`Quotation ${created.quoteNumber} created! Opening Deal Studio...`);
      navigate(`/quotations/${created.id}`);
    } catch (e: any) {
      toast.error('Failed to create quotation: ' + e.message);
    }
  };

  const filteredQuotes = quotations.filter((q) => {
    const matchesSearch =
      q.quoteNumber?.toLowerCase().includes(search.toLowerCase()) ||
      q.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || q.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-onyx flex items-center gap-2">
            <FileText className="w-5 h-5 text-signal" />
            Commercial Quotation Management
          </h2>
          <p className="text-xs text-graphite">View, build, and govern commercial proposals and discount ceilings</p>
        </div>
        {canCreateQuotation && (
          <button
            onClick={() => {
              if (customers.length > 0 && !newCustomerId) {
                setNewCustomerId(customers[0].id);
              }
              setShowCreateModal(true);
            }}
            className="btn-primary self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Create New Quotation
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-ash rounded-cards p-4 flex flex-col sm:flex-row gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-graphite absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Quote # or Customer Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-graphite" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
            <option value="APPROVED">APPROVED</option>
            <option value="SENT">SENT</option>
            <option value="UNDER_NEGOTIATION">UNDER NEGOTIATION</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white border border-ash rounded-cards overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-fog text-charcoal uppercase font-semibold text-[10px]">
              <tr>
                <th className="p-3.5">Quote #</th>
                <th className="p-3.5">Customer & Tier</th>
                <th className="p-3.5">Sales Rep</th>
                <th className="p-3.5">Subtotal</th>
                <th className="p-3.5">Discount</th>
                <th className="p-3.5">Net Total</th>
                <th className="p-3.5">Margin %</th>
                <th className="p-3.5">Blended Risk</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash text-charcoal">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-whisper">Loading quotations...</td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-whisper">No quotations found matching your criteria.</td>
                </tr>
              ) : (
                filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-fog/70 transition-colors group">
                    <td className="p-3.5 font-mono font-bold text-signal">
                      <Link to={`/quotations/${q.id}`} className="hover:underline">
                        {q.quoteNumber}
                      </Link>
                    </td>
                    <td className="p-3.5 font-semibold text-onyx">
                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-whisper" />
                        <span>{q.customer?.name}</span>
                        <span className="text-[10px] bg-fog text-charcoal border border-ash px-1.5 py-0.5 rounded font-mono uppercase">
                          {q.customer?.tier}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 text-xs text-onyx">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-fog border border-ash flex items-center justify-center text-[10px] font-bold text-onyx shrink-0">
                          {q.owner?.name?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-onyx truncate text-xs">{q.owner?.name || 'Unknown'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono">₹{q.subtotal?.toFixed(2)}</td>
                    <td className="p-3.5 font-mono text-amber-600">-₹{q.totalDiscount?.toFixed(2)}</td>
                    <td className="p-3.5 font-mono font-bold text-onyx">₹{q.netTotal?.toFixed(2)}</td>
                    <td className="p-3.5 font-mono font-semibold text-emerald-600">{q.totalMarginPercent}%</td>
                    <td className="p-3.5">
                      <RiskBadge riskScore={q.riskScore} riskBand={q.riskBand} riskExplanationJson={q.riskExplanation} compact />
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                        q.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        q.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        q.status === 'CONFIRMED' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                        q.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-fog text-charcoal border border-ash'
                      }`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        to={`/quotations/${q.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-fog hover:bg-signal text-charcoal hover:text-white rounded text-xs font-semibold transition-colors border border-ash"
                      >
                        Open Builder
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to Create New Quotation */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white border border-ash rounded-cards max-w-md w-full p-6 space-y-4 shadow-floating">
            <h3 className="text-lg font-bold text-onyx">Create New Quotation</h3>
            <form onSubmit={handleCreateQuote} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Select Customer / Target Company</label>
                {customers.length === 0 ? (
                  <div className="p-3 bg-fog rounded-lg border border-ash text-xs text-graphite flex items-center gap-2">
                    <Building className="w-4 h-4 text-graphite" />
                    <span>No customer companies available. Please ensure accounts exist.</span>
                  </div>
                ) : (
                  <select
                    value={newCustomerId}
                    onChange={(e) => setNewCustomerId(e.target.value)}
                    className="input"
                    required
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company ? `${c.company} — ${c.name}` : c.name} · [{c.tier} Tier]
                      </option>
                    ))}
                  </select>
                )}
                {newCustomerId && customers.find((c) => c.id === newCustomerId) && (
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between text-[11px]">
                    <span className="text-graphite">
                      Tier: <strong className="text-signal">{customers.find((c) => c.id === newCustomerId)?.tier}</strong>
                    </span>
                    <span className="text-graphite font-mono">
                      {customers.find((c) => c.id === newCustomerId)?.email}
                    </span>
                  </div>
                )}
              </div>

              {/* Optional Initial Product & Manual Discount */}
              <div className="space-y-3 pt-2 border-t border-ash">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-charcoal">
                    Initial Product & Custom Discount (Optional)
                  </label>
                  <span className="text-[10px] text-whisper">Configure line or add later</span>
                </div>

                <div className="space-y-1.5">
                  <select
                    value={initialProductId}
                    onChange={(e) => setInitialProductId(e.target.value)}
                    className="input text-xs"
                  >
                    <option value="">-- No initial product (Blank Draft) --</option>
                    {products.map((p) => {
                      const avail = (p.inventoryItems || []).reduce(
                        (s: number, it: any) =>
                          s + Math.max(0, (it.quantityOnHand || 0) - (it.quantityReserved || 0)),
                        0
                      );
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{p.basePrice} {p.unit}) — Stock: {avail} avail
                        </option>
                      );
                    })}
                  </select>
                </div>

                {initialProductId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-graphite">Quantity</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="1"
                        value={initialQuantity}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => setInitialQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                        onBlur={() => {
                          if (!initialQuantity || parseInt(initialQuantity, 10) < 1) {
                            setInitialQuantity('1');
                          }
                        }}
                        className="input text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-graphite flex items-center justify-between">
                        <span>Manual Discount %</span>
                        {(() => {
                          const sp = products.find((p) => p.id === initialProductId);
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
                          value={initialDiscount}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                              const num = parseFloat(raw);
                              if (raw === '' || isNaN(num)) {
                                setInitialDiscount(raw);
                              } else if (num >= 0 && num <= 100) {
                                setInitialDiscount(raw);
                              }
                            }
                          }}
                          className="input text-xs pr-6 font-bold text-amber-600 font-mono"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-graphite pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Initialize Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
