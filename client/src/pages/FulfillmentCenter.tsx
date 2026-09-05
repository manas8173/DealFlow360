import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { Truck, Warehouse, Package, ArrowRight, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

export const FulfillmentCenter: React.FC = () => {
  const toast = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideLineId, setOverrideLineId] = useState('');
  const [overrideWarehouseId, setOverrideWarehouseId] = useState('');
  const [overrideQty, setOverrideQty] = useState('1');
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      const [oData, wData] = await Promise.all([
        api.getFulfillmentOrders(),
        api.getWarehouses().catch(() => []),
      ]);
      setOrders(oData || []);
      setWarehouses(wData || []);
      if (wData && wData.length > 0) setOverrideWarehouseId(wData[0].id);
    } catch (e) {
      console.error('Failed to load fulfillment orders:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectOrder = async (order: any) => {
    setSelectedOrder(order);
    try {
      const recs = await api.getFulfillmentRecommendation(order.id);
      setRecommendations(recs || []);
      if (recs && recs.length > 0) setOverrideLineId(recs[0].lineId);
    } catch (e: any) {
      console.error('Failed to load split recommendation:', e);
    }
  };

  const handleAcceptSplit = async () => {
    if (!selectedOrder) return;
    try {
      await api.acceptFulfillmentSplit(selectedOrder.id);
      toast.success('Suggested multi-warehouse split accepted and inventory reserved!');
      setSelectedOrder(null);
      loadOrders();
    } catch (e: any) {
      toast.error('Failed to accept split: ' + e.message);
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !overrideReason) {
      toast.warning('Reason is mandatory for manual fulfillment override.');
      return;
    }

    try {
      await api.overrideFulfillment(selectedOrder.id, {
        lineId: overrideLineId,
        warehouseId: overrideWarehouseId,
        allocatedQty: Math.max(1, parseInt(overrideQty, 10) || 1),
        reason: overrideReason,
      });

      toast.success('Manual warehouse override recorded and audited successfully!');
      setShowOverrideModal(false);
      setOverrideReason('');
      handleSelectOrder(selectedOrder);
      loadOrders();
    } catch (e: any) {
      toast.error('Fulfillment override error: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-onyx flex items-center gap-2">
          <Truck className="w-5 h-5 text-signal" />
          Warehouse Fulfillment & Inventory Split Engine
        </h2>
        <p className="text-xs text-graphite">Multi-warehouse stock allocation algorithm, backorder tracking & manual overrides</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Orders List */}
        <div className="bg-white border border-ash rounded-xl p-4 space-y-3 shadow-sm">
          <h3 className="text-xs uppercase font-bold text-graphite tracking-wider">Confirmed & Fulfilling Orders</h3>

          {loading ? (
            <p className="text-xs text-whisper py-6 text-center">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-xs text-whisper py-6 text-center">No orders ready for fulfillment.</p>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => {
                const isSelected = selectedOrder?.id === o.id;
                return (
                  <div
                    key={o.id}
                    onClick={() => handleSelectOrder(o)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-brand-50 border-brand-200 shadow-sm'
                        : 'bg-white border-ash hover:bg-fog/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-signal text-xs">{o.quoteNumber}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-extrabold uppercase bg-fog text-charcoal border border-ash">
                        {o.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-onyx mt-1">{o.customer?.name}</p>
                    <div className="flex items-center justify-between text-[11px] text-graphite mt-2 pt-2 border-t border-ash">
                      <span>{o.lines?.length || 0} Line Items</span>
                      <span className="font-mono font-bold text-onyx">₹{o.netTotal?.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 2 Columns: Multi-Warehouse Split Recommendation */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedOrder ? (
            <div className="bg-white border border-ash rounded-xl p-12 text-center text-whisper space-y-3">
              <Warehouse className="w-10 h-10 mx-auto text-veil" />
              <p className="text-sm font-semibold">Select an order from the left list to evaluate warehouse allocation.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Order Header & Actions */}
              <div className="bg-white border border-ash rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                  <h3 className="text-base font-extrabold text-onyx">Order {selectedOrder.quoteNumber}</h3>
                  <p className="text-xs text-graphite">Customer: {selectedOrder.customer?.name} ({selectedOrder.customer?.tier} Tier)</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAcceptSplit}
                    className="btn-primary px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Accept Suggested Split
                  </button>
                  <button
                    onClick={() => setShowOverrideModal(true)}
                    className="btn-ghost px-4 py-2 rounded-lg text-xs font-semibold"
                  >
                    Manual Override
                  </button>
                </div>
              </div>

              {/* Multi-Warehouse Split Allocation Breakdown Cards */}
              <div className="space-y-4">
                <h4 className="text-xs uppercase font-bold text-graphite tracking-wider">Fulfillment Engine Warehouse Split Recommendations</h4>

                {recommendations.map((rec) => (
                  <div key={rec.lineId} className="bg-white border border-ash rounded-xl p-5 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between border-b border-ash pb-2.5">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-signal" />
                        <h4 className="text-sm font-bold text-onyx">{rec.productName}</h4>
                      </div>
                      <span className="text-xs font-mono font-bold text-charcoal">
                        Requested: <strong className="text-signal">{rec.requestedQty} units</strong>
                      </span>
                    </div>

                    {/* Allocations breakdown across warehouses */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {rec.allocations.map((alloc: any) => (
                        <div key={alloc.warehouseId} className="p-3 bg-fog border border-ash rounded-lg space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-onyx flex items-center gap-1.5">
                              <Warehouse className="w-3.5 h-3.5 text-graphite" />
                              {alloc.warehouseName}
                            </span>
                            <span className="text-[10px] text-graphite font-mono">({alloc.warehouseCode})</span>
                          </div>
                          <p className="text-xs font-semibold text-emerald-600 pt-1">
                            Allocated: {alloc.allocatedQty} units <span className="text-whisper font-normal">({alloc.availableQty} available)</span>
                          </p>
                          <p className="text-[10px] text-graphite">Est. Shipping Cost: ₹{alloc.shippingCost}</p>
                        </div>
                      ))}
                    </div>

                    {/* Backorder Warning Card */}
                    {rec.backorderQty > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-700">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span>Insufficient Stock across Warehouses: <strong>{rec.backorderQty} units backordered</strong>.</span>
                        </div>
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold uppercase">Backorder Created</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-ash rounded-xl max-w-md w-full p-6 space-y-4 shadow-floating">
            <div className="flex items-center justify-between border-b border-ash pb-3">
              <h3 className="text-lg font-bold text-onyx">Manual Warehouse Override</h3>
              <button onClick={() => setShowOverrideModal(false)} className="text-whisper hover:text-onyx">✕</button>
            </div>

            <form onSubmit={handleOverrideSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Target Line Item</label>
                <select
                  value={overrideLineId}
                  onChange={(e) => setOverrideLineId(e.target.value)}
                  className="input rounded-lg px-3 py-2 text-xs"
                >
                  {recommendations.map((r) => (
                    <option key={r.lineId} value={r.lineId}>
                      {r.productName} (Req: {r.requestedQty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Warehouse</label>
                <select
                  value={overrideWarehouseId}
                  onChange={(e) => setOverrideWarehouseId(e.target.value)}
                  className="input rounded-lg px-3 py-2 text-xs"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code}) - {w.location}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Allocated Quantity</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={overrideQty}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, '');
                    setOverrideQty(clean);
                  }}
                  onBlur={() => {
                    if (!overrideQty || parseInt(overrideQty, 10) < 1) {
                      setOverrideQty('1');
                    }
                  }}
                  className="input rounded-lg px-3 py-2 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Override Reason <span className="text-rose-600">* Mandatory</span></label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="State mandatory business justification for manual fulfillment override..."
                  className="input rounded-lg p-2.5 text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="btn-ghost px-4 py-2 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 rounded-lg text-xs font-semibold"
                >
                  Submit Audit Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
