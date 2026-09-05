import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import {
  Activity,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Bell,
  CheckCircle2,
  User,
  ArrowUpRight,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import { useToast } from '../components/Toast';

export const DealHealthView: React.FC = () => {
  const toast = useToast();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    try {
      setLoading(true);
      const data = await api.getDealHealthAlerts();
      setAlerts(data || []);
    } catch (e: any) {
      console.error('Failed to load deal health alerts:', e);
      toast.error('Failed to load deal health alerts: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleNudge = async (id: string) => {
    try {
      setActionId(id);
      await api.nudgeAlert(id);
      toast.success('Nudge notification dispatched to Sales Rep!');
      await loadAlerts();
    } catch (e: any) {
      toast.error('Nudge error: ' + e.message);
    } finally {
      setActionId(null);
    }
  };

  const handleEscalate = async (id: string) => {
    try {
      setActionId(id);
      await api.escalateAlert(id);
      toast.warning('Deal priority escalated to Sales VP!');
      await loadAlerts();
    } catch (e: any) {
      toast.error('Escalation error: ' + e.message);
    } finally {
      setActionId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    if (!confirm('Are you sure you want to dismiss this health alert?')) return;
    try {
      setActionId(id);
      await api.dismissAlert(id);
      toast.success('Deal health alert dismissed.');
      await loadAlerts();
    } catch (e: any) {
      toast.error('Dismiss error: ' + e.message);
    } finally {
      setActionId(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all deal health alerts?')) return;
    try {
      setLoading(true);
      await api.clearAllAlerts();
      toast.success('All deal health alerts cleared.');
      await loadAlerts();
    } catch (e: any) {
      toast.error('Clear all error: ' + e.message);
      setLoading(false);
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
        <p className="text-xs text-graphite">
          Automated real-time governance detecting stalled proposals, discount outliers, and delivery slippages
        </p>
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
          <p className="text-[11px] text-graphite">Validity / Warehouse Stock Risk</p>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white border border-ash rounded-cards overflow-hidden shadow-sm">
        <div className="p-4 border-b border-ash flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs uppercase font-bold text-charcoal tracking-wider">Active Health Alert Records</h3>
            <span className="px-2 py-0.5 rounded-full bg-fog text-graphite text-[10px] font-bold font-mono">
              {alerts.length} Total Flags
            </span>
          </div>
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <button
                onClick={handleClearAll}
                className="btn-danger-ghost text-xs py-1 px-3 flex items-center gap-1.5 text-rose-600 hover:bg-rose-50"
                title="Remove and dismiss all active deal health alerts"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All Alerts
              </button>
            )}
            <button onClick={loadAlerts} className="btn-ghost text-xs py-1 px-3">
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-fog text-charcoal uppercase font-semibold text-[10px]">
              <tr>
                <th className="p-3.5">Flag Type</th>
                <th className="p-3.5">Target Deal #</th>
                <th className="p-3.5">Customer Organization</th>
                <th className="p-3.5">Sales Representative</th>
                <th className="p-3.5">Diagnostic Details</th>
                <th className="p-3.5">Severity</th>
                <th className="p-3.5">Health Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash text-charcoal">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-whisper">
                    Evaluating deal health anomalies...
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-whisper">
                    No active deal health alerts detected. All proposals within normal operational thresholds.
                  </td>
                </tr>
              ) : (
                alerts.map((a) => {
                  const isProcessing = actionId === a.id;
                  const ownerName = a.quotation?.owner?.name || 'Alex Rep';
                  const ownerEmail = a.quotation?.owner?.email || 'rep@dealflow360.demo';

                  return (
                    <tr key={a.id} className="hover:bg-fog/70 transition-colors">
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase inline-block ${
                            a.alertType === 'STALLED'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : a.alertType === 'DISCOUNT_ANOMALY'
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {a.alertType}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-signal">
                        <Link
                          to={`/quotations/${a.quotation?.id}`}
                          className="hover:underline inline-flex items-center gap-1"
                        >
                          {a.quotation?.quoteNumber}
                          <ArrowUpRight className="w-3 h-3 text-whisper" />
                        </Link>
                      </td>

                      <td className="p-3.5 font-semibold text-onyx">
                        <p>{a.quotation?.customer?.name || 'Customer'}</p>
                        {a.quotation?.customer?.company && (
                          <p className="text-[10px] text-whisper">{a.quotation?.customer?.company}</p>
                        )}
                      </td>

                      {/* Sales Representative Column */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-fog border border-ash flex items-center justify-center text-[10px] font-bold text-onyx shrink-0">
                            {ownerName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-onyx truncate text-xs">{ownerName}</p>
                            <p className="text-[10px] text-whisper font-mono truncate">{ownerEmail}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 max-w-xs leading-relaxed text-charcoal">{a.message}</td>

                      <td className="p-3.5">
                        <span
                          className={`font-bold font-mono text-[11px] px-2 py-0.5 rounded ${
                            a.severity === 'HIGH' || a.severity === 'CRITICAL'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {a.severity}
                        </span>
                      </td>

                      <td className="p-3.5">
                        {a.status === 'NUDGED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Bell className="w-3 h-3 text-indigo-500" />
                            Nudged (Rep Alerted)
                          </span>
                        ) : a.status === 'ESCALATED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            <ShieldAlert className="w-3 h-3 text-rose-500" />
                            Escalated to VP
                          </span>
                        ) : a.status === 'RESOLVED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            <Activity className="w-3 h-3 text-amber-500" />
                            Active Flag
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleNudge(a.id)}
                          disabled={isProcessing}
                          className="btn-ghost px-2.5 py-1 rounded text-xs font-semibold text-signal hover:bg-emerald-50"
                          title="Send high-priority notification to Deal Owner"
                        >
                          {isProcessing ? '...' : a.status === 'NUDGED' ? 'Nudge Again' : 'Nudge Rep'}
                        </button>
                        <button
                          onClick={() => handleEscalate(a.id)}
                          disabled={isProcessing}
                          className="btn-danger-ghost px-2.5 py-1 rounded text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          title="Escalate deal to Executive / Sales VP review"
                        >
                          {isProcessing ? '...' : a.status === 'ESCALATED' ? 'Escalated' : 'Escalate'}
                        </button>
                        <button
                          onClick={() => handleDismiss(a.id)}
                          disabled={isProcessing}
                          className="btn-ghost p-1.5 rounded text-xs text-graphite hover:text-rose-600 hover:bg-rose-50 inline-flex items-center"
                          title="Dismiss / Remove this alert"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
};
