import React, { useEffect, useState } from 'react';
import { api, getStoredUser } from '../api';
import { Settings, RefreshCw, Package, Warehouse, Layers, ShieldCheck, Building, UserCheck, CheckCircle2, XCircle } from 'lucide-react';

export const AdminConfig: React.FC = () => {
  const currentUser = getStoredUser();
  const isAdmin = currentUser?.role === 'ADMIN';
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [signupRequests, setSignupRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      setLoading(true);
      const [pData, cData, tData, wData] = await Promise.all([
        api.getProducts().catch(() => []),
        api.getCategories().catch(() => []),
        api.getTiers().catch(() => []),
        api.getWarehouses().catch(() => []),
      ]);
      setProducts(pData || []);
      setCategories(cData || []);
      setTiers(tData || []);
      setWarehouses(wData || []);
      if (isAdmin) {
        loadSignupRequests();
      }
    } catch (e) {
      console.error('Failed to load admin config:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadSignupRequests() {
    try {
      const data = await api.getSignupRequests();
      setSignupRequests(data || []);
    } catch (e: any) {
      console.error('Failed to load signup requests:', e);
    }
  }

  const handleApproveSignup = async (id: string, name: string) => {
    if (!confirm(`Approve employee sign-up for ${name}?`)) return;
    try {
      await api.approveSignupRequest(id);
      alert(`Approved sign-up for ${name}. They can now sign in.`);
      loadSignupRequests();
    } catch (e: any) {
      alert('Approval failed: ' + e.message);
    }
  };

  const handleRejectSignup = async (id: string, name: string) => {
    if (!confirm(`Reject employee sign-up for ${name}?`)) return;
    try {
      await api.rejectSignupRequest(id);
      alert(`Rejected sign-up for ${name}.`);
      loadSignupRequests();
    } catch (e: any) {
      alert('Rejection failed: ' + e.message);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('Reset entire database to default seed state?')) return;
    try {
      setResetting(true);
      await api.resetDatabase();
      alert('Database successfully reset and re-seeded!');
      loadConfig();
    } catch (e: any) {
      alert('Reset error: ' + e.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-onyx flex items-center gap-2">
            <Settings className="w-5 h-5 text-signal" />
            Admin Platform Configuration & Governance
          </h2>
          <p className="text-xs text-graphite">Configure product catalog, category ceilings, customer tiers & warehouses</p>
        </div>
        <button
          onClick={handleResetDatabase}
          disabled={resetting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-rose-500/20 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
          {resetting ? 'Resetting DB...' : 'Reset Database'}
        </button>
      </div>

      {/* Grid of Config Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Tiers Discount Ceilings */}
        <div className="bg-white border border-ash rounded-cards p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 border-b border-ash pb-2.5">
            <ShieldCheck className="w-4 h-4 text-signal" />
            <h3 className="text-sm font-bold text-onyx">Customer Tier Discount Ceilings</h3>
          </div>
          <div className="space-y-2 text-xs">
            {tiers.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-fog rounded-lg border border-ash">
                <span className="font-bold text-onyx">{t.tier} Tier</span>
                <span className="font-mono font-bold text-amber-600">{t.maxDiscountPercent}% Max Discount</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Discount Ceilings */}
        <div className="bg-white border border-ash rounded-cards p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 border-b border-ash pb-2.5">
            <Layers className="w-4 h-4 text-signal" />
            <h3 className="text-sm font-bold text-onyx">Category Discount Limits</h3>
          </div>
          <div className="space-y-2 text-xs">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-fog rounded-lg border border-ash">
                <span className="font-bold text-onyx">{c.name}</span>
                <span className="font-mono font-bold text-amber-600">{c.discountCeilingPercent}% Category Limit</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Employee Sign-Up Approvals */}
      {isAdmin && (
        <div className="bg-white border border-ash rounded-cards p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 border-b border-ash pb-2.5">
            <UserCheck className="w-4 h-4 text-signal" />
            <h3 className="text-sm font-bold text-onyx">Employee Sign-Up Approvals</h3>
            <span className="ml-auto text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-bold">
              {signupRequests.filter((r) => r.status === 'PENDING_APPROVAL').length} Pending
            </span>
          </div>

          {signupRequests.length === 0 ? (
            <p className="text-xs text-whisper py-2">No employee sign-up requests awaiting review.</p>
          ) : (
            <div className="space-y-2">
              {signupRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 bg-fog rounded-lg border border-ash flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-onyx truncate">{req.name}</p>
                    <p className="text-[11px] text-graphite truncate">
                      {req.email} <span className="text-signal font-semibold">· {req.role}</span>
                    </p>
                    <p className="text-[10px] text-whisper">
                      Requested {new Date(req.createdAt).toLocaleDateString()}
                      {req.company ? ` · ${req.company}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        req.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-600 border border-rose-200'
                      }`}
                    >
                      {req.status === 'PENDING_APPROVAL' ? 'Pending' : 'Rejected'}
                    </span>
                    {req.status === 'PENDING_APPROVAL' && (
                      <>
                        <button
                          onClick={() => handleApproveSignup(req.id, req.name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectSignup(req.id, req.name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600/80 hover:bg-rose-500 text-white rounded text-[11px] font-semibold transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product Catalog & Warehouses */}
      <div className="bg-white border border-ash rounded-cards p-5 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-onyx flex items-center gap-2">
          <Package className="w-4 h-4 text-signal" />
          Product Catalog & Base Pricing
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-fog text-charcoal uppercase text-[10px]">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Base Price</th>
                <th className="p-3">Cost Price</th>
                <th className="p-3">Tax %</th>
                <th className="p-3">Subscription Eligible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash text-charcoal">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 font-mono font-bold text-signal">{p.sku}</td>
                  <td className="p-3 font-semibold text-onyx">{p.name}</td>
                  <td className="p-3 text-graphite">{p.category?.name}</td>
                  <td className="p-3 font-mono font-bold text-onyx">₹{p.basePrice?.toFixed(2)}</td>
                  <td className="p-3 font-mono text-graphite">₹{p.costPrice?.toFixed(2)}</td>
                  <td className="p-3 font-mono">{p.taxPercent}%</td>
                  <td className="p-3 font-bold text-signal">{p.isSubscriptionEligible ? 'YES' : 'NO'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
