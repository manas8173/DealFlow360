import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Activity, AlertTriangle, Clock, ArrowRight, ShieldAlert, Bell, ChevronRight } from 'lucide-react';

export const DealHealthView: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    try {
      setLoading(true);
      const data = await api.getDealHealthAlerts();
      setAlerts(data || []);
    } catch (e) {
      console.error('Failed to load deal health alerts:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleNudge = async (id: string) => {
    try {
      await api.nudgeAlert(id);
      alert('Nudge notification sent to Sales Rep!');
      loadAlerts();
    } catch (e: any) {
      alert('Nudge error: ' + e.message);
    }
  };

  const handleEscalate = async (id: string) => {
    try {
      await api.escalateAlert(id);
      alert('Deal escalated to Sales VP!');
      loadAlerts();
    } catch (e: any) {
      alert('Escalation error: ' + e.message);
    }
  };

  const stalledAlerts = alerts.filter((a) => a.alertType === 'STALLED');
  const anomalyAlerts = alerts.filter((a) => a.alertType === 'DISCOUNT_ANOMALY');
  const slippageAlerts = alerts.filter((a) => a.alertType === 'DELIVERY_SLIPPAGE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-onyx flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-500" />
          Deal Health & Anomaly Detection Dashboard
        </h2>
        <p className="text-xs text-graphite">Automated detection of stalled deals, high-discount anomalies & delivery risks</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-ash rounded-cards p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-amber-600">Stalled Deals</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-onyx font-mono">{stalledAlerts.length}</p>
          <p className="text-[11px] text-graphite">&gt; 7 Days Idle Activity</p>
        </div>

        <div className="bg-white border border-ash rounded-cards p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-rose-600">Discount Anomalies</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-onyx font-mono">{anomalyAlerts.length}</p>
          <p className="text-[11px] text-graphite">&gt; 1.5x Rep Historical Average</p>
        </div>

        <div className="bg-white border border-ash rounded-cards p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-indigo-600">Delivery Slippage</span>
            <ShieldAlert className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-extrabold text-onyx font-mono">{slippageAlerts.length}</p>
          <p className="text-[11px] text-graphite">Warehouse Stock Risk</p>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white border border-ash rounded-cards overflow-hidden shadow-sm">
        <div className="p-4 border-b border-ash flex items-center justify-between">
          <h3 className="text-xs uppercase font-bold text-charcoal tracking-wider">Active Health Alert Records</h3>
          <span className="text-xs text-whisper font-mono">{alerts.length} Total Flags</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-fog text-charcoal uppercase font-semibold text-[10px]">
              <tr>
                <th className="p-3.5">Flag Type</th>
                <th className="p-3.5">Target Deal #</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Diagnostic Details</th>
                <th className="p-3.5">Severity</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash text-charcoal">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-whisper">Evaluating deal health anomalies...</td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-whisper">No active deal health alerts detected.</td>
                </tr>
              ) : (
                alerts.map((a) => (
                  <tr key={a.id} className="hover:bg-fog/70 transition-colors">
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        a.alertType === 'STALLED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        a.alertType === 'DISCOUNT_ANOMALY' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {a.alertType}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-signal">
                      <Link to={`/quotations/${a.quotation?.id}`} className="hover:underline">
                        {a.quotation?.quoteNumber}
                      </Link>
                    </td>
                    <td className="p-3.5 font-semibold text-onyx">{a.quotation?.customer?.name}</td>
                    <td className="p-3.5 max-w-xs leading-relaxed text-charcoal">{a.message}</td>
                    <td className="p-3.5 font-bold font-mono text-xs">{a.severity}</td>
                    <td className="p-3.5">
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-fog text-charcoal border border-ash">
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleNudge(a.id)}
                        className="btn-ghost px-2 py-1 rounded text-xs"
                      >
                        Nudge Rep
                      </button>
                      <button
                        onClick={() => handleEscalate(a.id)}
                        className="btn-danger-ghost px-2 py-1 rounded text-xs"
                      >
                        Escalate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
