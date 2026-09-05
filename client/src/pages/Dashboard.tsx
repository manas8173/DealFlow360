import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { RiskBadge } from '../components/RiskBadge';
import {
  FileText,
  CheckSquare,
  Activity,
  IndianRupee,
  TrendingUp,
  Clock,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  Package,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [qData, aData, hData] = await Promise.all([
          api.getQuotations(),
          api.getApprovals().catch(() => []),
          api.getDealHealthAlerts().catch(() => []),
        ]);
        setQuotations(qData || []);
        setApprovals(aData || []);
        setAlerts(hData || []);
      } catch (e) {
        console.error('Failed to load dashboard:', e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const totalPipelineValue = quotations.reduce((acc, q) => acc + (q.netTotal || 0), 0);
  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;
  const highRiskCount = quotations.filter((q) => q.riskBand === 'HIGH').length;
  const activeAlertsCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-graphite">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        <span>Loading DealFlow360 Executive Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-ash p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-onyx tracking-tight">Sales Operations Command Center</h2>
          <p className="text-xs text-graphite">Live Deal Governance, Discount Risk Monitoring & Automated Workflow Engine</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/quotations"
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            View Quotations
          </Link>
          <Link
            to="/approvals"
            className="btn-ghost"
          >
            <CheckSquare className="w-4 h-4 text-signal" />
            Approvals ({pendingApprovalsCount})
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-ash rounded-cards p-4 space-y-2 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-graphite">Total Quote Pipeline</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-onyx font-mono">₹{totalPipelineValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" />
            {quotations.length} Active Commercial Quotes
          </p>
        </div>

        <div className="bg-white border border-ash rounded-cards p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-graphite">Pending Approvals</span>
            <CheckSquare className="w-4 h-4 text-signal" />
          </div>
          <p className="text-2xl font-extrabold text-onyx font-mono">{pendingApprovalsCount}</p>
          <p className="text-[11px] text-graphite">Awaiting Manager / Finance Action</p>
        </div>

        <div className="bg-white border border-ash rounded-cards p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-graphite">High Risk Deals</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-extrabold text-onyx font-mono">{highRiskCount}</p>
          <p className="text-[11px] text-rose-600 font-medium">Exceeds Discount Ceilings</p>
        </div>

        <div className="bg-white border border-ash rounded-cards p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-graphite">Deal Health Alerts</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-onyx font-mono">{activeAlertsCount}</p>
          <p className="text-[11px] text-amber-600 font-medium">Stalled Deals & Anomalies</p>
        </div>
      </div>

      {/* Content Columns: Recent Quotations & Deal Health Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Quotations */}
        <div className="lg:col-span-2 bg-white border border-ash rounded-cards p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-ash pb-3">
            <h3 className="text-sm font-bold text-onyx flex items-center gap-2">
              <FileText className="w-4 h-4 text-signal" />
              Recent Commercial Quotations
            </h3>
            <Link to="/quotations" className="text-xs text-signal hover:text-emerald-700 font-semibold flex items-center gap-1">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-fog text-charcoal uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-3">Quote #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Net Total</th>
                  <th className="p-3">Margin %</th>
                  <th className="p-3">Risk Band</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash text-charcoal">
                {quotations.slice(0, 5).map((q) => (
                  <tr key={q.id} className="hover:bg-fog/70 transition-colors">
                    <td className="p-3 font-mono font-bold text-signal">
                      <Link to={`/quotations/${q.id}`} className="hover:underline">
                        {q.quoteNumber}
                      </Link>
                    </td>
                    <td className="p-3 font-semibold text-onyx">
                      {q.customer?.name}
                      <span className="ml-1.5 text-[10px] text-graphite bg-fog px-1.5 py-0.5 rounded font-normal">
                        {q.customer?.tier}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-medium">₹{q.netTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 font-mono font-semibold text-emerald-600">{q.totalMarginPercent}%</td>
                    <td className="p-3">
                      <RiskBadge riskScore={q.riskScore} riskBand={q.riskBand} riskExplanationJson={q.riskExplanation} compact />
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-fog text-charcoal border border-ash">
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Deal Health Alerts Quick Widget */}
        <div className="bg-white border border-ash rounded-cards p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-ash pb-3">
            <h3 className="text-sm font-bold text-onyx flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-600" />
              Active Deal Alerts
            </h3>
            <Link to="/deal-health" className="text-xs text-signal hover:text-emerald-700 font-semibold">
              View Engine
            </Link>
          </div>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-xs text-whisper py-6 text-center">No active deal health alerts detected.</p>
            ) : (
              alerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="p-3 bg-fog/70 border border-ash rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      alert.alertType === 'STALLED' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                      alert.alertType === 'DISCOUNT_ANOMALY' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-violet-50 text-violet-700 border border-violet-200'
                    }`}>
                      {alert.alertType}
                    </span>
                    <span className="text-[10px] text-whisper font-mono">Q-{alert.quotation?.quoteNumber}</span>
                  </div>
                  <p className="text-xs text-charcoal font-medium leading-snug">{alert.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
