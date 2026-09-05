import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Repeat, Calendar, RefreshCw, Info } from 'lucide-react';

export const SubscriptionsView: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [newQty, setNewQty] = useState(1);
  const [prorationResult, setProrationResult] = useState<any>(null);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  async function loadSubscriptions() {
    try {
      setLoading(true);
      const data = await api.getSubscriptions();
      setSubscriptions(data || []);
    } catch (e) {
      console.error('Failed to load subscriptions:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleModifySubscription = (sub: any) => {
    setSelectedSub(sub);
    setNewQty(sub.quantity);
    setProrationResult(null);
  };

  const handleSimulateProration = async () => {
    if (!selectedSub) return;
    try {
      const res = await api.modifySubscription(selectedSub.id, newQty);
      setProrationResult(res.proration);
      loadSubscriptions();
    } catch (e: any) {
      alert('Proration modification error: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-onyx flex items-center gap-2">
          <Repeat className="w-5 h-5 text-signal" />
          Recurring Subscriptions & Hybrid Billing Schedules
        </h2>
        <p className="text-xs text-graphite">Automated recurring billing cycles, proration calculations & mid-cycle subscription adjustments</p>
      </div>

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="lg:col-span-2 text-center py-12 text-whisper">Loading subscription schedules...</div>
        ) : subscriptions.length === 0 ? (
          <div className="lg:col-span-2 text-center py-12 text-whisper bg-white border border-ash rounded-xl">
            No active recurring subscriptions generated yet. Confirm a quote containing recurring products (e.g. Care Plan 2yr) to spawn billing schedules.
          </div>
        ) : (
          subscriptions.map((sub) => (
            <div key={sub.id} className="bg-white border border-ash rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-ash pb-3">
                <div>
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-brand-50 text-signal border border-brand-100">
                    {sub.billingCycle} CYCLE
                  </span>
                  <h3 className="text-base font-bold text-onyx mt-1">{sub.planName}</h3>
                  <p className="text-xs text-graphite">Customer: {sub.customer?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-onyx font-mono">₹{(sub.unitPrice * sub.quantity).toFixed(2)}</p>
                  <p className="text-[10px] text-whisper">Qty: {sub.quantity} × ₹{sub.unitPrice}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-fog rounded-lg border border-ash">
                  <p className="text-whisper text-[10px] uppercase font-semibold">Start Date</p>
                  <p className="text-onyx font-mono mt-0.5">{new Date(sub.startDate).toLocaleDateString()}</p>
                </div>
                <div className="p-2.5 bg-fog rounded-lg border border-ash">
                  <p className="text-whisper text-[10px] uppercase font-semibold">Next Billing Date</p>
                  <p className="text-signal font-mono font-bold mt-0.5">{new Date(sub.nextBillingDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Upcoming Schedules */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] uppercase font-bold text-graphite">Upcoming Billing Schedules</p>
                <div className="space-y-1">
                  {sub.billingSchedules?.slice(0, 3).map((sched: any) => (
                    <div key={sched.id} className="flex items-center justify-between text-xs p-2 bg-fog rounded border border-ash">
                      <span className="font-mono text-charcoal">{new Date(sched.invoiceDate).toLocaleDateString()}</span>
                      <span className="font-mono font-bold text-onyx">₹{sched.amount?.toFixed(2)}</span>
                      <span className="text-[10px] bg-fog text-charcoal border border-ash px-1.5 py-0.5 rounded font-mono">{sched.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => handleModifySubscription(sub)}
                  className="btn-ghost px-3.5 py-1.5 rounded-lg text-xs font-semibold text-signal"
                >
                  Modify Quantity & Prorate
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Proration Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-ash rounded-xl max-w-md w-full p-6 space-y-4 shadow-floating">
            <div className="flex items-center justify-between border-b border-ash pb-3">
              <h3 className="text-lg font-bold text-onyx">Modify Subscription Proration</h3>
              <button onClick={() => setSelectedSub(null)} className="text-whisper hover:text-onyx">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-charcoal">
                Adjust plan quantity mid-cycle for <strong className="text-onyx">{selectedSub.planName}</strong>. The system will calculate exact daily proration adjustments.
              </p>

              <div className="space-y-1.5">
                <label className="font-semibold text-charcoal">New Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={newQty}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setNewQty(parseInt(e.target.value) || 1)}
                  className="input rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <button
                onClick={handleSimulateProration}
                className="btn-primary w-full py-2 rounded-lg text-xs font-semibold"
              >
                Calculate Proration & Apply
              </button>

              {prorationResult && (
                <div className="p-3 bg-fog border border-ash rounded-lg space-y-1.5 text-xs">
                  <p className="font-bold text-onyx uppercase text-[10px]">Proration Calculation Breakdown</p>
                  <div className="flex justify-between text-graphite">
                    <span>Unused Old Value (Credit):</span>
                    <span className="font-mono text-emerald-600">-₹{prorationResult.unusedOldValue?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-graphite">
                    <span>New Remaining Value (Charge):</span>
                    <span className="font-mono text-amber-600">+₹{prorationResult.newRemainingValue?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-onyx pt-1 border-t border-ash">
                    <span>Net Adjustment:</span>
                    <span className="font-mono text-signal">₹{prorationResult.netAdjustment?.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
