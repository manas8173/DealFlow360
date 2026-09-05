import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { BarChart3, TrendingUp, IndianRupee, Award, Download, CheckCircle2 } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getQuotations();
        setQuotations(data || []);
      } catch (e) {
        console.error('Failed to load reports:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalQuoteValue = quotations.reduce((acc, q) => acc + (q.netTotal || 0), 0);
  const totalMarginValue = quotations.reduce((acc, q) => acc + (q.totalMargin || 0), 0);
  const avgMarginPercent = totalQuoteValue > 0 ? (totalMarginValue / totalQuoteValue) * 100 : 0;

  const handleExportXLS = () => {
    alert('Exporting operational sales report to CSV/XLS...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-onyx flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-signal" />
            Executive Sales Operations Reports & Analytics
          </h2>
          <p className="text-xs text-graphite">Margin quality metrics, win rates, approval velocity & upsell performance</p>
        </div>
        <button
          onClick={handleExportXLS}
          className="btn-ghost px-4 py-2 rounded-lg text-xs"
        >
          <Download className="w-4 h-4 text-signal" />
          Export Report XLS
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-ash rounded-cards p-4 space-y-1 shadow-sm">
          <span className="text-xs uppercase font-bold text-charcoal flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5 text-signal" />
            Gross Pipeline Value
          </span>
          <p className="text-2xl font-extrabold text-onyx font-mono">₹{totalQuoteValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-emerald-600 font-medium">Across {quotations.length} Active Deals</p>
        </div>

        <div className="bg-white border border-ash rounded-cards p-4 space-y-1 shadow-sm">
          <span className="text-xs uppercase font-bold text-charcoal">Total Governed Margin</span>
          <p className="text-2xl font-extrabold text-signal font-mono">₹{totalMarginValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-graphite">Avg Margin Quality: {avgMarginPercent.toFixed(1)}%</p>
        </div>

        <div className="bg-white border border-ash rounded-cards p-4 space-y-1 shadow-sm">
          <span className="text-xs uppercase font-bold text-charcoal">Top Performing Upsell</span>
          <p className="text-xl font-extrabold text-onyx">Docking Station 12% OFF</p>
          <p className="text-[11px] text-signal font-medium">+₹40.00 Margin Delta</p>
        </div>
      </div>

      {/* Performance Summary Table */}
      <div className="bg-white border border-ash rounded-cards p-5 space-y-4 shadow-sm">
        <h3 className="text-xs uppercase font-bold text-charcoal tracking-wider">Quotation Performance Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-fog text-charcoal uppercase text-[10px]">
              <tr>
                <th className="p-3">Quote #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Subtotal</th>
                <th className="p-3">Discount</th>
                <th className="p-3">Net Total</th>
                <th className="p-3">Margin ₹</th>
                <th className="p-3">Risk Band</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash text-charcoal">
              {quotations.map((q) => (
                <tr key={q.id}>
                  <td className="p-3 font-mono font-bold text-signal">{q.quoteNumber}</td>
                  <td className="p-3 font-semibold text-onyx">{q.customer?.name}</td>
                  <td className="p-3 font-mono">₹{q.subtotal?.toFixed(2)}</td>
                  <td className="p-3 font-mono text-amber-600">-₹{q.totalDiscount?.toFixed(2)}</td>
                  <td className="p-3 font-mono font-bold text-onyx">₹{q.netTotal?.toFixed(2)}</td>
                  <td className="p-3 font-mono font-semibold text-signal">₹{q.totalMargin?.toFixed(2)} ({q.totalMarginPercent}%)</td>
                  <td className="p-3 font-bold">{q.riskBand}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
