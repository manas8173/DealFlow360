import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { RiskBadge } from '../components/RiskBadge';
import { ApprovalTracker } from '../components/ApprovalTracker';
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
} from 'lucide-react';

export const QuotationBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingProductId, setAddingProductId] = useState('');
  const [addingQuantity, setAddingQuantity] = useState<string>('1');
  const [addingDiscount, setAddingDiscount] = useState(0);
  const [addError, setAddError] = useState<string | null>(null);

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
    } finally {
      setLoading(false);
    }
  }

  const handleLineUpdate = async (lineId: string, quantity: number, discountPercent: number) => {
    try {
      const updated = await api.updateLineItem(id!, lineId, { quantity, discountPercent });
      setQuote(updated);
      // Reload recommendations for updated quote items
      const recs = await api.getRecommendations(id!);
      setRecommendations(recs);
    } catch (e: any) {
      alert('Failed to update line: ' + e.message);
    }
  };

  const handleRemoveLine = async (lineId: string) => {
    try {
      const updated = await api.deleteLineItem(id!, lineId);
      setQuote(updated);
      const recs = await api.getRecommendations(id!);
      setRecommendations(recs);
    } catch (e: any) {
      alert('Failed to remove line: ' + e.message);
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
        discountPercent: addingDiscount,
      });
      setQuote(updated);
      setAddingQuantity('1');
      const recs = await api.getRecommendations(id!);
      setRecommendations(recs);
    } catch (e: any) {
      alert('Failed to add line item: ' + e.message);
    }
  };

  const handleAddRecommendation = async (productId: string, promoDiscount?: number) => {
    try {
      const updated = await api.addRecommendation(id!, productId, promoDiscount);
      setQuote(updated);
      const recs = await api.getRecommendations(id!);
      setRecommendations(recs);
    } catch (e: any) {
      alert('Failed to add recommendation: ' + e.message);
    }
  };

  const handleSubmitApproval = async () => {
    try {
      const res = await api.submitQuotation(id!);
      alert(res.result.message || 'Quotation submitted for approval!');
      loadQuotationDetails();
    } catch (e: any) {
      alert('Submission failed: ' + e.message);
    }
  };

  const handleSendToCustomer = async () => {
    try {
      await api.sendQuotation(id!);
      alert('Quotation successfully sent to customer portal!');
      loadQuotationDetails();
    } catch (e: any) {
      alert('Failed to send quote: ' + e.message);
    }
  };

  if (loading || !quote) {
    return (
      <div className="flex items-center justify-center py-20 text-graphite">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        <span>Loading Quotation Engine...</span>
      </div>
    );
  }

  const latestApprovalRequest = quote.approvalRequests && quote.approvalRequests.length > 0 ? quote.approvalRequests[0] : null;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-ash p-5 rounded-xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link to="/quotations" className="p-1.5 text-graphite hover:text-onyx bg-fog hover:bg-fog/70 rounded-lg border border-ash">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h2 className="text-xl font-extrabold text-onyx font-mono">{quote.quoteNumber}</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-brand-50 text-signal border border-brand-100">
              Rev v{quote.version}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase bg-fog text-charcoal border border-ash">
              {quote.status}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-graphite pt-1">
            <span className="flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-whisper" />
              Customer: <strong className="text-onyx">{quote.customer?.name}</strong> ({quote.customer?.tier} Tier)
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-whisper" />
              Valid Until: <strong className="text-charcoal">{new Date(quote.validityDate).toLocaleDateString()}</strong>
            </span>
          </div>
        </div>

        {/* Live Blended Risk & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <RiskBadge riskScore={quote.riskScore} riskBand={quote.riskBand} riskExplanationJson={quote.riskExplanation} />

          {quote.status === 'DRAFT' || quote.status === 'REVISION_REQUIRED' ? (
            <button
              onClick={handleSubmitApproval}
              className="btn-primary"
            >
              <CheckSquare className="w-4 h-4" />
              Submit for Approval
            </button>
          ) : quote.status === 'APPROVED' ? (
            <button
              onClick={handleSendToCustomer}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              Send to Customer Portal
            </button>
          ) : null}
        </div>
      </div>

      {/* Approval Tracker Workflow Banner */}
      {latestApprovalRequest && (
        <ApprovalTracker
          steps={latestApprovalRequest.steps}
          currentStepIndex={latestApprovalRequest.currentStepIndex}
          requestStatus={latestApprovalRequest.status}
        />
      )}

      {/* Main Builder Layout: Left 2 Cols (Product Table), Right Col (Upsell Drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quotation Products Table & Line Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add Product Line Controls */}
          <div className="bg-white border border-ash rounded-cards p-4 space-y-3 shadow-sm">
            <h3 className="text-xs uppercase font-bold text-graphite tracking-wider flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-signal" />
              Add Product to Quotation
            </h3>
            <form onSubmit={handleAddLine} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <select
                  value={addingProductId}
                  onChange={(e) => setAddingProductId(e.target.value)}
                  className="input"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.basePrice} {p.unit}) - {p.category?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
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
                  className="input"
                />
              </div>
              <button
                type="submit"
                className="btn-primary justify-center"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </form>
            {addError && (
              <div className="flex items-center gap-2 text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {addError}
              </div>
            )}
          </div>

          {/* Quotation Lines Table */}
          <div className="bg-white border border-ash rounded-cards overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-fog text-charcoal uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="p-3.5">Product</th>
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
                        No product lines in quotation. Use control panel above or click an upsell recommendation on the right.
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
                              {line.isRecurring && (
                                <span className="text-[10px] text-signal bg-brand-50 border border-brand-100 px-1.5 py-0.2 rounded">
                                  Recurring ({line.billingCycle || 'MONTHLY'})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-graphite">{line.product?.category?.name}</td>
                          <td className="p-3.5">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={line.quantity}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) => {
                                const clean = e.target.value.replace(/[^0-9]/g, '');
                                const qty = parseInt(clean, 10);
                                if (qty >= 1) handleLineUpdate(line.id, qty, line.discountPercent);
                              }}
                              className="input w-16 text-center"
                            />
                          </td>
                          <td className="p-3.5 font-mono">₹{line.unitPrice?.toFixed(2)}</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={line.discountPercent}
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => handleLineUpdate(line.id, line.quantity, parseFloat(e.target.value) || 0)}
                                className="input w-16 text-center font-bold text-amber-600"
                              />
                              <span className="text-graphite">%</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  isOver ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {line.status}
                              </span>
                              <p className="text-[10px] text-whisper">Allowed: {line.effectiveCeiling}%</p>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-onyx">₹{line.totalAmount?.toFixed(2)}</td>
                          <td className="p-3.5 font-mono font-semibold text-emerald-600">
                            {line.marginPercent?.toFixed(1)}% (₹{line.marginAmount?.toFixed(2)})
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleRemoveLine(line.id)}
                              className="p-1.5 text-whisper hover:text-crimson hover:bg-fog rounded transition-colors"
                              title="Delete line"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
        </div>

        {/* Right Column: Upsell & Cross-Sell Recommendation Engine Drawer */}
        <div className="space-y-4">
          <div className="bg-white border border-ash rounded-cards p-5 space-y-4 shadow-sm">
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
                  <div key={rec.id} className="p-3.5 bg-fog/70 border border-ash hover:border-signal/40 rounded-xl space-y-2.5 transition-all">
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
                          <p className="text-amber-600 text-[10px] font-semibold">{rec.promotionDiscountPercent}% Promo OFF</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddRecommendation(rec.targetProduct.id, rec.promotionDiscountPercent)}
                        className="btn-primary text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add to Quote
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
