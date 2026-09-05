import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../components/Toast';
import {
  Warehouse,
  Package,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Layers,
  MapPin,
  FilePlus,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface WarehouseBreakdown {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  location: string;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
}

interface ProductStock {
  id: string;
  sku: string;
  name: string;
  description?: string;
  basePrice: number;
  unit: string;
  category?: {
    id: string;
    name: string;
    discountCeilingPercent?: number;
  };
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  warehouseBreakdown: WarehouseBreakdown[];
}

export const WarehouseStock: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [stats, setStats] = useState({
    totalWarehouses: 0,
    totalSKUs: 0,
    totalOnHand: 0,
    totalReserved: 0,
    totalAvailable: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'products' | 'warehouses'>('products');

  useEffect(() => {
    loadInventoryData();
  }, []);

  async function loadInventoryData(isManualRefresh = false) {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await api.getInventoryStock();
      setWarehouses(res.warehouses || []);
      setProducts(res.products || []);
      if (res.stats) {
        setStats(res.stats);
      }
      if (isManualRefresh) {
        toast.success('Warehouse stock data refreshed!');
      }
    } catch (err: any) {
      console.error('Failed to load inventory stock:', err);
      toast.error('Failed to load warehouse stock: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category?.name && p.category.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'IN_STOCK' && p.status === 'IN_STOCK') ||
      (statusFilter === 'LOW_STOCK' && p.status === 'LOW_STOCK') ||
      (statusFilter === 'OUT_OF_STOCK' && p.status === 'OUT_OF_STOCK');

    const matchesWarehouse =
      selectedWarehouse === 'ALL' ||
      p.warehouseBreakdown.some((wb) => wb.warehouseId === selectedWarehouse && wb.onHandQty > 0);

    return matchesSearch && matchesStatus && matchesWarehouse;
  });

  return (
    <div className="space-y-6">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-signal">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-onyx font-display">Warehouse Stock & Inventory</h2>
              <p className="text-xs text-graphite">
                Real-time stock on hand, allocated reserves & available units across distribution hubs
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadInventoryData(true)}
            disabled={refreshing || loading}
            className="btn-ghost px-3 py-2 text-xs font-semibold flex items-center gap-1.5"
            title="Refresh inventory levels"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Stock'}</span>
          </button>

          <Link
            to="/quotations"
            className="btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>Create Quotation</span>
          </Link>
        </div>
      </div>

      {/* ── KPI Metric Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-ash rounded-xl p-3.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-graphite">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Hubs</span>
            <Warehouse className="w-4 h-4 text-signal" />
          </div>
          <p className="text-xl font-extrabold text-onyx font-mono">{stats.totalWarehouses}</p>
          <p className="text-[10px] text-whisper">Multi-depot network</p>
        </div>

        <div className="bg-white border border-ash rounded-xl p-3.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-graphite">
            <span className="text-[10px] font-bold uppercase tracking-wider">Catalog SKUs</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-extrabold text-onyx font-mono">{stats.totalSKUs}</p>
          <p className="text-[10px] text-whisper">Products managed</p>
        </div>

        <div className="bg-white border border-ash rounded-xl p-3.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-graphite">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total On-Hand</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-onyx font-mono">{stats.totalOnHand}</p>
          <p className="text-[10px] text-whisper">Units physically present</p>
        </div>

        <div className="bg-white border border-ash rounded-xl p-3.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-graphite">
            <span className="text-[10px] font-bold uppercase tracking-wider">Reserved Units</span>
            <TrendingDown className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-extrabold text-amber-600 font-mono">{stats.totalReserved}</p>
          <p className="text-[10px] text-whisper">Locked in orders/quotes</p>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/40 rounded-xl p-3.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">Available Stock</span>
            <CheckCircle2 className="w-4 h-4 text-signal" />
          </div>
          <p className="text-xl font-extrabold text-signal font-mono">{stats.totalAvailable}</p>
          <p className="text-[10px] text-emerald-700">Free to promise</p>
        </div>

        <div className="bg-white border border-ash rounded-xl p-3.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-graphite">
            <span className="text-[10px] font-bold uppercase tracking-wider">Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-extrabold text-rose-600 font-mono">
              {stats.lowStockCount + stats.outOfStockCount}
            </p>
            <span className="text-[10px] font-semibold text-whisper">
              ({stats.outOfStockCount} out)
            </span>
          </div>
          <p className="text-[10px] text-whisper">Low or depleted items</p>
        </div>
      </div>

      {/* ── Filter & Search Bar ───────────────────────────────── */}
      <div className="bg-white border border-ash rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-whisper pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Product Name, SKU, or Category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input rounded-lg pl-9 pr-4 py-2 text-xs w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Warehouse Filter */}
            <div className="flex items-center gap-1.5 text-xs text-charcoal">
              <MapPin className="w-3.5 h-3.5 text-graphite shrink-0" />
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="input rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium"
              >
                <option value="ALL">All Warehouses ({warehouses.length})</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-charcoal">
              <Filter className="w-3.5 h-3.5 text-graphite shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium"
              >
                <option value="ALL">All Availability</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock (&lt; 10)</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-fog rounded-lg p-0.5 border border-ash">
              <button
                onClick={() => setViewMode('products')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'products'
                    ? 'bg-white text-onyx shadow-xs'
                    : 'text-graphite hover:text-onyx'
                }`}
              >
                By Product
              </button>
              <button
                onClick={() => setViewMode('warehouses')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'warehouses'
                    ? 'bg-white text-onyx shadow-xs'
                    : 'text-graphite hover:text-onyx'
                }`}
              >
                By Warehouse
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ─────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-ash rounded-xl space-y-3">
          <RefreshCw className="w-6 h-6 text-signal animate-spin mx-auto" />
          <p className="text-xs text-graphite font-medium">Scanning live warehouse stock across hubs...</p>
        </div>
      ) : viewMode === 'products' ? (
        /* PRODUCT-CENTRIC VIEW */
        <div className="bg-white border border-ash rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-ash bg-fog/50 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-2">
              <Package className="w-4 h-4 text-signal" />
              Product Catalog Stock Availability ({filteredProducts.length} Items)
            </h3>
            <span className="text-[11px] text-whisper font-medium">
              Real-time available stock = On-Hand minus Reserved
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-10 text-center text-graphite space-y-2">
              <Package className="w-8 h-8 mx-auto text-whisper" />
              <p className="text-xs font-medium">No products match your current search and filter criteria.</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedWarehouse('ALL');
                  setStatusFilter('ALL');
                }}
                className="text-xs text-signal font-semibold hover:underline"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-ash">
              {filteredProducts.map((p) => {
                const totalStock = p.totalOnHand;
                const reservedPct = totalStock > 0 ? Math.min(100, Math.round((p.totalReserved / totalStock) * 100)) : 0;
                const availablePct = 100 - reservedPct;

                return (
                  <div key={p.id} className="p-5 hover:bg-canvas/50 transition-colors space-y-3">
                    {/* Product Summary Row */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-onyx">{p.name}</span>
                          <span className="px-2 py-0.5 rounded bg-fog border border-ash text-[10px] font-mono font-semibold text-graphite">
                            {p.sku}
                          </span>
                          {p.category && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-signal border border-emerald-100 text-[10px] font-semibold">
                              {p.category.name}
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="text-xs text-graphite line-clamp-1">{p.description}</p>
                        )}
                      </div>

                      {/* Stock Badges & Metrics */}
                      <div className="flex items-center gap-6 shrink-0">
                        {/* Status Badge */}
                        <div>
                          {p.status === 'IN_STOCK' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-signal" />
                              In Stock
                            </span>
                          ) : p.status === 'LOW_STOCK' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              Low Stock (&lt; 10)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              Out of Stock
                            </span>
                          )}
                        </div>

                        {/* Figures */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="p-1.5 bg-fog rounded-lg border border-ash min-w-[70px]">
                            <p className="text-[9px] uppercase font-bold text-whisper">On-Hand</p>
                            <p className="text-xs font-extrabold text-onyx font-mono">{p.totalOnHand}</p>
                          </div>
                          <div className="p-1.5 bg-fog rounded-lg border border-ash min-w-[70px]">
                            <p className="text-[9px] uppercase font-bold text-whisper">Reserved</p>
                            <p className="text-xs font-extrabold text-amber-600 font-mono">{p.totalReserved}</p>
                          </div>
                          <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-200 min-w-[80px]">
                            <p className="text-[9px] uppercase font-bold text-emerald-800">Available</p>
                            <p className="text-xs font-extrabold text-signal font-mono">{p.totalAvailable}</p>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right min-w-[90px]">
                          <p className="text-[10px] uppercase font-bold text-whisper">Base Price</p>
                          <p className="text-xs font-bold text-onyx font-mono">
                            ₹{p.basePrice?.toFixed ? p.basePrice.toFixed(2) : p.basePrice}
                          </p>
                          <span className="text-[9px] text-whisper font-medium">per {p.unit}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Allocation Visual Bar */}
                    {totalStock > 0 && (
                      <div className="space-y-1">
                        <div className="h-2 w-full bg-ash/40 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${availablePct}%` }}
                            className="bg-signal transition-all"
                            title={`Available: ${p.totalAvailable} units (${availablePct}%)`}
                          />
                          <div
                            style={{ width: `${reservedPct}%` }}
                            className="bg-amber-400 transition-all"
                            title={`Reserved: ${p.totalReserved} units (${reservedPct}%)`}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-whisper font-mono">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-signal"></span>
                            {p.totalAvailable} Available ({availablePct}%)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            {p.totalReserved} Reserved ({reservedPct}%)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Warehouse Depots Breakdown */}
                    {p.warehouseBreakdown && p.warehouseBreakdown.length > 0 && (
                      <div className="pt-2 border-t border-ash/40">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-graphite mb-2">
                          Warehouse Depot Distribution
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {p.warehouseBreakdown.map((wb) => (
                            <div
                              key={wb.warehouseId}
                              className="p-2.5 rounded-lg border border-ash bg-white flex items-center justify-between text-xs"
                            >
                              <div className="overflow-hidden pr-2">
                                <div className="flex items-center gap-1.5">
                                  <Warehouse className="w-3.5 h-3.5 text-signal shrink-0" />
                                  <span className="font-semibold text-onyx truncate">
                                    {wb.warehouseName}
                                  </span>
                                </div>
                                <p className="text-[10px] text-whisper flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {wb.location} ({wb.warehouseCode})
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-mono font-extrabold text-signal text-xs">
                                  {wb.availableQty}
                                </span>
                                <span className="text-[10px] text-whisper block font-mono">
                                  of {wb.onHandQty} on-hand
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* WAREHOUSE-CENTRIC VIEW */
        <div className="space-y-6">
          {warehouses.map((w) => {
            const inventory = w.inventoryItems || [];
            const totalWhOnHand = inventory.reduce((sum: number, it: any) => sum + it.onHandQty, 0);
            const totalWhReserved = inventory.reduce((sum: number, it: any) => sum + it.reservedQty, 0);
            const totalWhAvail = Math.max(0, totalWhOnHand - totalWhReserved);

            return (
              <div key={w.id} className="bg-white border border-ash rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-ash bg-fog/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-ash flex items-center justify-center text-signal shadow-xs">
                      <Warehouse className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-onyx">{w.name}</h3>
                        <span className="px-2 py-0.5 rounded bg-white border border-ash text-[10px] font-mono font-bold text-graphite">
                          {w.code}
                        </span>
                      </div>
                      <p className="text-xs text-graphite flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-whisper" />
                        {w.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-center">
                    <div className="px-3 py-1.5 bg-white rounded-lg border border-ash">
                      <p className="text-[9px] uppercase font-bold text-whisper">On-Hand</p>
                      <p className="text-xs font-extrabold text-onyx font-mono">{totalWhOnHand}</p>
                    </div>
                    <div className="px-3 py-1.5 bg-white rounded-lg border border-ash">
                      <p className="text-[9px] uppercase font-bold text-whisper">Reserved</p>
                      <p className="text-xs font-extrabold text-amber-600 font-mono">{totalWhReserved}</p>
                    </div>
                    <div className="px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-[9px] uppercase font-bold text-emerald-800">Available</p>
                      <p className="text-xs font-extrabold text-signal font-mono">{totalWhAvail}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  {inventory.length === 0 ? (
                    <p className="text-xs text-whisper text-center py-6">
                      No stock allocated to this warehouse yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {inventory.map((item: any) => {
                        const product = item.product || {};
                        const avail = Math.max(0, item.onHandQty - item.reservedQty);
                        const isLow = avail > 0 && avail < 10;
                        const isOut = avail <= 0;

                        return (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-xl border border-ash bg-canvas/30 space-y-2 hover:bg-canvas transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-bold text-xs text-onyx leading-tight">
                                  {product.name || 'Unknown Product'}
                                </p>
                                <p className="text-[10px] font-mono text-whisper mt-0.5">
                                  {product.sku}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                  isOut
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : isLow
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-signal border border-emerald-200'
                                }`}
                              >
                                {isOut ? 'Depleted' : isLow ? 'Low Stock' : 'Ready'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-ash/40 text-xs">
                              <span className="text-whisper text-[10px]">Stock Status</span>
                              <div className="text-right">
                                <span className="font-mono font-extrabold text-onyx text-xs">
                                  {avail} available
                                </span>
                                <span className="text-[10px] text-whisper block font-mono">
                                  ({item.onHandQty} on-hand • {item.reservedQty} res)
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
