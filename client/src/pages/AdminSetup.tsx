import React, { useEffect, useState } from 'react';
import { api, getStoredUser } from '../api';
import { useToast } from '../components/Toast';
import {
  Settings,
  Package,
  Tags,
  Layers,
  Warehouse,
  ListOrdered,
  CalendarRange,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  ScrollText,
} from 'lucide-react';

type Tab = 'signups' | 'customers' | 'products' | 'categories' | 'tiers' | 'warehouses' | 'price-lists' | 'audit';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'signups', label: 'Employee Sign-Ups', icon: UserCheck },
  { key: 'customers', label: 'Customer Accounts', icon: Building2 },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'categories', label: 'Categories', icon: Tags },
  { key: 'tiers', label: 'Discount Tiers', icon: Layers },
  { key: 'warehouses', label: 'Warehouses', icon: Warehouse },
  { key: 'price-lists', label: 'Price Lists', icon: ListOrdered },
  { key: 'audit', label: 'Audit Trail', icon: ScrollText },
];

const TIERS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

export const AdminSetup: React.FC = () => {
  const user = getStoredUser();
  const [tab, setTab] = useState<Tab>('signups');

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      window.location.href = '/login';
    }
  }, [user]);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="bg-white border border-ash rounded-xl p-8 text-center space-y-3 shadow-sm max-w-md mx-auto my-12">
        <p className="text-sm font-bold text-rose-600">Admin Authorization Required</p>
        <p className="text-xs text-graphite">Please sign in with administrator credentials (admin@dealflow360.demo) to access the Admin Console.</p>
        <a href="/login" className="btn-primary inline-flex justify-center">Go to Sign In</a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-onyx flex items-center gap-2">
          <Settings className="w-5 h-5 text-signal" />
          Admin Setup Console
        </h2>
        <p className="text-xs text-graphite">Restricted area — manage employee approvals, customers, catalog, pricing governance, warehouses, and audit logs</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-ash pb-3">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === key
                ? 'bg-emerald-50 text-signal border border-emerald-100'
                : 'text-graphite hover:bg-fog border border-transparent'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'signups' && <SignupsTab />}
      {tab === 'customers' && <CustomersTab />}
      {tab === 'products' && <ProductsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'tiers' && <TiersTab />}
      {tab === 'warehouses' && <WarehousesTab />}
      {tab === 'price-lists' && <PriceListsTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
};

const FormInput = ({ label, value, onChange, type = 'text', placeholder, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) => (
  <div className="space-y-1">
    <label className="text-[10px] uppercase tracking-wider font-bold text-graphite">{label}</label>
    <input
      type={type === 'number' ? 'text' : type}
      inputMode={type === 'number' ? 'decimal' : undefined}
      value={value}
      placeholder={placeholder}
      required={required}
      onChange={(e) => {
        if (type === 'number') {
          const val = e.target.value;
          if (val === '' || /^\d*\.?\d*$/.test(val)) {
            onChange(val);
          }
        } else {
          onChange(e.target.value);
        }
      }}
      className="input rounded-lg px-3 py-2 text-xs font-medium"
    />
  </div>
);

const SectionCard: React.FC<{ title: string; subtitle?: string; action?: any; children: React.ReactNode }> = ({ title, subtitle, action, children }) => (
  <div className="bg-white border border-ash rounded-xl p-5 space-y-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm font-bold text-onyx">{title}</h3>
        {subtitle && <p className="text-[11px] text-graphite mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const ProductsTab: React.FC = () => {
  const toast = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({ sku: '', name: '', categoryId: '', basePrice: '', costPrice: '', unit: 'unit' });

  const load = async () => {
    try {
      setProducts(await api.getProducts());
      setCategories(await api.getCategories());
    } catch (e) { /* handled globally */ }
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createProduct({ ...form, basePrice: parseFloat(form.basePrice), costPrice: parseFloat(form.costPrice || '0') });
      setForm({ sku: '', name: '', categoryId: '', basePrice: '', costPrice: '', unit: 'unit' });
      toast.success('Product created successfully!');
      load();
    } catch (err: any) {
      toast.error('Create product failed: ' + err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SectionCard title="Add Product" subtitle="New catalog item with base pricing">
        <form onSubmit={create} className="space-y-3">
          <FormInput label="SKU" value={form.sku} placeholder="PROD-001" onChange={(v) => setForm({ ...form, sku: v })} required />
          <FormInput label="Name" value={form.name} placeholder="Enterprise Router" onChange={(v) => setForm({ ...form, name: v })} required />
          <FormInput label="Base Price (₹)" type="number" value={form.basePrice} onChange={(v) => setForm({ ...form, basePrice: v })} required />
          <FormInput label="Cost Price (₹)" type="number" value={form.costPrice} onChange={(v) => setForm({ ...form, costPrice: v })} />
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-bold text-graphite">Category</label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="input rounded-lg px-3 py-2 text-xs" required>
              <option value="">Select category...</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary w-full py-2 rounded-lg text-xs font-semibold">Create Product</button>
        </form>
      </SectionCard>

      <div className="lg:col-span-2">
        <SectionCard title={`Products (${products.length})`} subtitle="Existing catalog">
          <div className="max-h-[26rem] overflow-y-auto space-y-2 pr-1">
            {products.length === 0 && <p className="text-xs text-whisper">No products found.</p>}
            {products.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-fog rounded-lg border border-ash text-xs">
                <div>
                  <p className="font-semibold text-onyx">{p.name} <span className="text-[10px] text-whisper font-mono">· {p.sku}</span></p>
                  <p className="text-whisper text-[10px]">{p.category?.name}</p>
                </div>
                <div className="text-right font-mono">
                  <p className="font-bold text-onyx">₹{p.basePrice?.toFixed ? p.basePrice.toFixed(2) : p.basePrice}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

const CategoriesTab: React.FC = () => {
  const toast = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [ceiling, setCeiling] = useState('10');

  const load = async () => {
    try { setCategories(await api.getCategories()); } catch (e) { /* handled globally */ }
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCategory({ name, discountCeilingPercent: parseFloat(ceiling) });
      setName('');
      setCeiling('10');
      toast.success('Category created successfully!');
      load();
    } catch (err: any) {
      toast.error('Create category failed: ' + err.message);
    }
  };

  const updateCeiling = async (id: string, val: string) => {
    try {
      await api.updateCategory(id, { discountCeilingPercent: parseFloat(val) });
      toast.success('Category ceiling updated!');
      load();
    } catch (err: any) {
      toast.error('Update category failed: ' + err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SectionCard title="Add Category" subtitle="Category-level discount ceiling">
        <form onSubmit={create} className="space-y-3">
          <FormInput label="Name" value={name} onChange={setName} required />
          <FormInput label="Discount Ceiling (%)" type="number" value={ceiling} onChange={setCeiling} required />
          <button type="submit" className="btn-primary w-full py-2 rounded-lg text-xs font-semibold">Create Category</button>
        </form>
      </SectionCard>

      <div className="lg:col-span-2">
        <SectionCard title={`Categories (${categories.length})`} subtitle="Adjust ceilings inline">
          <div className="space-y-2">
            {categories.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-fog rounded-lg border border-ash text-xs">
                <p className="font-semibold text-onyx">{c.name}</p>
                <div className="flex items-center gap-3">
                  <span className="text-whisper text-[10px] uppercase">Ceiling</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={c.discountCeilingPercent}
                    className="input rounded-lg px-3 py-1.5 text-xs w-24 text-center font-mono font-bold"
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0 && val <= 100 && val !== Number(c.discountCeilingPercent)) {
                        updateCeiling(c.id, String(val));
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

const TiersTab: React.FC = () => {
  const toast = useToast();
  const [tiers, setTiers] = useState<any[]>([]);

  const load = async () => {
    try { setTiers(await api.getTiers()); } catch (e) { /* handled globally */ }
  };
  useEffect(() => { load(); }, []);

  const update = async (tier: string, maxDiscountPercent: number) => {
    try {
      await api.updateTier(tier, { maxDiscountPercent });
      toast.success(`Updated ${tier} tier limit to ${maxDiscountPercent}%`);
      load();
    } catch (err: any) {
      toast.error('Update tier failed: ' + err.message);
    }
  };

  return (
    <SectionCard title="Customer Discount Tiers" subtitle="Max discount ceiling per tier">
      <div className="space-y-2">
        {tiers.length === 0 && <p className="text-xs text-whisper">Loading tiers...</p>}
        {tiers.map((t: any) => (
          <div key={t.tier} className="flex items-center justify-between p-3 bg-fog rounded-lg border border-ash text-xs">
            <div>
              <p className="font-bold text-onyx uppercase">{t.tier}</p>
              {TIERS.includes(t.tier) && <span className="text-[10px] text-whisper">Max permissible discount</span>}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                defaultValue={t.maxDiscountPercent}
                className="input rounded-lg px-3 py-1.5 text-xs w-24 text-center font-mono font-bold"
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0 && val <= 100 && val !== Number(t.maxDiscountPercent)) {
                    update(t.tier, val);
                  }
                }}
              />
              <span className="text-whisper text-[10px]">%</span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

const WarehousesTab: React.FC = () => {
  const toast = useToast();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', code: '', location: '' });

  const load = async () => {
    try { setWarehouses(await api.getWarehouses()); } catch (e) { /* handled globally */ }
  };
  useEffect(() => {
    load();
    api.getProducts().then(setProducts).catch(() => {});
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createWarehouse(form);
      setForm({ name: '', code: '', location: '' });
      toast.success('Warehouse created successfully!');
      load();
    } catch (err: any) {
      toast.error('Create warehouse failed: ' + err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SectionCard title="Add Warehouse" subtitle="Fulfillment location">
        <form onSubmit={create} className="space-y-3">
          <FormInput label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <FormInput label="Code" value={form.code} placeholder="BOM-01" onChange={(v) => setForm({ ...form, code: v })} required />
          <FormInput label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          <button type="submit" className="btn-primary w-full py-2 rounded-lg text-xs font-semibold">Create Warehouse</button>
        </form>
      </SectionCard>

      <div className="lg:col-span-2">
        <SectionCard title={`Warehouses (${warehouses.length})`} subtitle="Manage warehouse locations and product stock levels">
          <div className="max-h-[30rem] overflow-y-auto space-y-3 pr-1">
            {warehouses.map((w: any) => (
              <div key={w.id} className="p-4 bg-fog rounded-xl border border-ash space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ash/60 pb-2">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-onyx text-sm">{w.name}</p>
                    <span className="text-[10px] font-mono font-bold bg-white border border-ash px-2 py-0.5 rounded text-signal">
                      {w.code}
                    </span>
                  </div>
                  <span className="text-graphite text-xs">📍 {w.location || 'No location set'}</span>
                </div>

                {/* Existing Stock Summary */}
                {w.inventoryItems && w.inventoryItems.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase text-graphite tracking-wider">Current Stock On Hand:</p>
                    <div className="flex flex-wrap gap-2">
                      {w.inventoryItems.map((inv: any) => (
                        <span key={inv.id} className="inline-flex items-center gap-1.5 bg-white border border-ash px-2.5 py-1 rounded-lg text-xs font-medium text-onyx shadow-2xs">
                          <span className="text-charcoal">{inv.product?.name}:</span>
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            {inv.quantityOnHand} units
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock Adjustment Controls */}
                <div className="pt-2 border-t border-ash/50 space-y-2">
                  <p className="text-[10px] font-bold uppercase text-graphite tracking-wider">Add or Update Product Stock:</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <div className="flex-1 min-w-[220px]">
                      <select
                        id={`wh-${w.id}`}
                        className="input rounded-lg px-3 py-2 text-xs font-medium bg-white border-ash w-full"
                      >
                        <option value="">-- Choose Product ({products.length} available) --</option>
                        {products.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) — Base: ₹{p.basePrice?.toFixed ? p.basePrice.toFixed(2) : p.basePrice}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id={`wh-qty-${w.id}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Qty (e.g. 50)"
                        className="input rounded-lg px-3 py-2 text-xs font-mono font-bold w-28 text-center"
                        onInput={(e) => {
                          const target = e.currentTarget;
                          target.value = target.value.replace(/[^0-9]/g, '');
                        }}
                      />
                      <button
                        onClick={async () => {
                          const sel = document.getElementById(`wh-${w.id}`) as HTMLSelectElement;
                          const qty = document.getElementById(`wh-qty-${w.id}`) as HTMLInputElement;
                          if (!sel.value) return toast.warning('Please select a product first');
                          const cleanQty = qty.value.trim();
                          if (cleanQty === '' || isNaN(parseInt(cleanQty, 10)) || parseInt(cleanQty, 10) < 0) {
                            return toast.error('Please enter a valid stock quantity (0 or greater)');
                          }
                          try {
                            await api.upsertInventory(w.id, { productId: sel.value, onHandQty: parseInt(cleanQty, 10) });
                            qty.value = '';
                            toast.success('Inventory stock updated successfully!');
                            load();
                          } catch (err: any) {
                            toast.error('Inventory update failed: ' + err.message);
                          }
                        }}
                        className="btn-primary px-4 py-2 rounded-lg text-xs font-semibold shrink-0"
                      >
                        Set Stock
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

const PriceListsTab: React.FC = () => {
  const toast = useToast();
  const [lists, setLists] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [tier, setTier] = useState('GOLD');
  const [currency, setCurrency] = useState('INR');

  const load = async () => {
    try { setLists(await api.getPriceLists()); } catch (e) { /* handled globally */ }
  };
  useEffect(() => {
    load();
    api.getProducts().then(setProducts).catch(() => {});
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPriceList({ name, customerTier: tier, currency });
      setName('');
      toast.success('Price list created successfully!');
      load();
    } catch (err: any) {
      toast.error('Create price list failed: ' + err.message);
    }
  };

  const addRule = async (listId: string, productId: string, customPrice: string, discountAdjustment: string) => {
    try {
      await api.addPriceListRule(listId, {
        productId,
        customPrice: customPrice ? parseFloat(customPrice) : null,
        discountAdjustment: discountAdjustment ? parseFloat(discountAdjustment) : 0,
      });
      toast.success('Price list rule added!');
      load();
    } catch (err: any) {
      toast.error('Add rule failed: ' + err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SectionCard title="New Price List" subtitle="Tier-bound price list">
        <form onSubmit={create} className="space-y-3">
          <FormInput label="Name" value={name} placeholder="Enterprise Gold Standard" onChange={setName} required />
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-bold text-graphite">Customer Tier</label>
            <select value={tier} onChange={(e) => setTier(e.target.value)} className="input rounded-lg px-3 py-2 text-xs">
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <FormInput label="Currency" value={currency} onChange={setCurrency} required />
          <button type="submit" className="btn-primary w-full py-2 rounded-lg text-xs font-semibold">Create Price List</button>
        </form>
      </SectionCard>

      <div className="lg:col-span-2">
        <SectionCard title={`Price Lists (${lists.length})`} subtitle="Override pricing per product">
          <div className="max-h-[26rem] overflow-y-auto space-y-3 pr-1">
            {lists.map((l: any) => (
              <div key={l.id} className="p-3 bg-fog rounded-lg border border-ash space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-onyx">{l.name} <span className="text-[10px] text-whisper font-mono">· {l.customerTier} · {l.currency}</span></p>
                  <span className="text-[10px] bg-brand-50 text-signal border border-brand-100 px-1.5 py-0.5 rounded font-semibold">{l.rules?.length || 0} rules</span>
                </div>
                <div className="space-y-1">
                  {l.rules?.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded border border-ash/60">
                      <span>{r.product?.name}</span>
                      <span className="font-mono text-charcoal">
                        {r.customPrice ? `₹${r.customPrice}` : 'default'} {r.discountAdjustment ? `· adj ${r.discountAdjustment}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-ash/50">
                  <select id={`pl-${l.id}`} className="input rounded-lg px-3 py-2 text-xs flex-1 min-w-[180px] bg-white">
                    <option value="">-- Choose Product to Add Rule --</option>
                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                  <input
                    id={`pl-price-${l.id}`}
                    type="text"
                    inputMode="decimal"
                    placeholder="₹ custom price"
                    onInput={(e) => {
                      const t = e.currentTarget;
                      if (!/^\d*\.?\d*$/.test(t.value)) t.value = t.value.slice(0, -1);
                    }}
                    className="input rounded-lg px-3 py-2 text-xs w-28 font-mono"
                  />
                  <input
                    id={`pl-adj-${l.id}`}
                    type="text"
                    inputMode="decimal"
                    placeholder="adj % (e.g. 5)"
                    onInput={(e) => {
                      const t = e.currentTarget;
                      if (!/^\d*\.?\d*$/.test(t.value)) t.value = t.value.slice(0, -1);
                    }}
                    className="input rounded-lg px-3 py-2 text-xs w-24 font-mono"
                  />
                  <button
                    onClick={() => {
                      const sel = document.getElementById(`pl-${l.id}`) as HTMLSelectElement;
                      if (!sel.value) return toast.warning('Select a product');
                      const price = (document.getElementById(`pl-price-${l.id}`) as HTMLInputElement).value;
                      const adj = (document.getElementById(`pl-adj-${l.id}`) as HTMLInputElement).value;
                      addRule(l.id, sel.value, price, adj);
                    }}
                    className="btn-primary px-3 py-2 rounded-lg text-xs font-semibold shrink-0"
                  >
                    Add Rule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

const SignupsTab = () => {
  const toast = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getSignupRequests();
      setRequests(data || []);
    } catch (err: any) {
      toast.error('Failed to load sign-up requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id: string, name: string) => {
    try {
      await api.approveSignupRequest(id);
      toast.success(`Approved employee account for ${name}. They can now log in!`);
      load();
    } catch (err: any) {
      toast.error('Approval failed: ' + err.message);
    }
  };

  const handleReject = async (id: string, name: string) => {
    try {
      await api.rejectSignupRequest(id);
      toast.info(`Rejected sign-up request for ${name}.`);
      load();
    } catch (err: any) {
      toast.error('Rejection failed: ' + err.message);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING_APPROVAL').length;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-ash rounded-cards p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-ash pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-signal" />
            <div>
              <h3 className="text-sm font-bold text-onyx">Employee Sign-Up Approvals</h3>
              <p className="text-xs text-graphite">
                Review and approve new employee accounts (Sales Rep, Sales Manager, Finance Operations) before they can access DealFlow360.
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
            {pendingCount} Pending Approval
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-graphite">Loading employee requests...</div>
        ) : requests.length === 0 ? (
          <div className="py-8 text-center text-xs text-graphite">
            No employee sign-up requests awaiting decision.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req: any) => (
              <div
                key={req.id}
                className="p-4 bg-fog rounded-xl border border-ash flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-onyx text-sm">{req.name}</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-ash text-signal">
                      {req.role}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        req.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : req.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {req.status === 'PENDING_APPROVAL' ? 'Pending Approval' : req.status}
                    </span>
                  </div>
                  <p className="text-graphite font-mono text-[11px]">
                    {req.email} {req.company ? `· ${req.company}` : ''}
                  </p>
                  <p className="text-[10px] text-whisper flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Requested on {new Date(req.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {req.status === 'PENDING_APPROVAL' ? (
                    <>
                      <button
                        onClick={() => handleApprove(req.id, req.name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve Access
                      </button>
                      <button
                        onClick={() => handleReject(req.id, req.name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] font-semibold text-whisper italic">
                      Decision Recorded ({req.status})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CustomersTab: React.FC = () => {
  const toast = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res: any = await api.getCustomers();
      setCustomers(res || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load customer accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleTierChange = async (customerId: string, newTier: string) => {
    try {
      await api.updateCustomer(customerId, { tier: newTier });
      toast.success(`Customer tier updated to ${newTier}`);
      loadCustomers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update customer tier');
    }
  };

  const filtered = customers.filter((c) =>
    (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SectionCard
      title="Customer Accounts"
      subtitle="Manage registered B2B clients, assign discount tiers, and inspect connected users"
      action={
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search company or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-xs py-1.5 px-3 w-56"
          />
          <button onClick={loadCustomers} className="btn-ghost text-xs py-1.5">
            Refresh
          </button>
        </div>
      }
    >
      {loading ? (
        <p className="text-xs text-whisper py-4 text-center">Loading customer accounts...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-whisper py-4 text-center">No customer accounts found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-fog text-graphite border-b border-ash font-semibold">
              <tr>
                <th className="p-3">Company & Contact</th>
                <th className="p-3">Email</th>
                <th className="p-3">Discount Tier</th>
                <th className="p-3">Portal Users</th>
                <th className="p-3">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-fog/50">
                  <td className="p-3">
                    <p className="font-semibold text-onyx">{c.company}</p>
                    <p className="text-[11px] text-graphite">{c.name}</p>
                  </td>
                  <td className="p-3 font-mono text-graphite">{c.email}</td>
                  <td className="p-3">
                    <select
                      value={c.tier}
                      onChange={(e) => handleTierChange(c.id, e.target.value)}
                      className="text-xs font-semibold px-2 py-1 rounded bg-fog border border-ash text-onyx"
                    >
                      {TIERS.map((t) => (
                        <option key={t} value={t}>
                          {t} Tier
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-graphite">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                      {(c.users || []).length} user{c.users?.length === 1 ? '' : 's'}
                    </span>
                  </td>
                  <td className="p-3 text-whisper text-[11px]">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
};

const AuditTab: React.FC = () => {
  const toast = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res: any = await api.getAuditLogs();
      setLogs(res || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) =>
    filterAction ? (log.action || '').toLowerCase().includes(filterAction.toLowerCase()) || (log.entityType || '').toLowerCase().includes(filterAction.toLowerCase()) : true
  );

  return (
    <SectionCard
      title="System Audit Trail & Governance"
      subtitle="Immutable chronological ledger of sensitive pricing, approval, fulfillment, and user actions"
      action={
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter by action or entity..."
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="input text-xs py-1.5 px-3 w-56"
          />
          <button onClick={loadLogs} className="btn-ghost text-xs py-1.5">
            Refresh
          </button>
        </div>
      }
    >
      {loading ? (
        <p className="text-xs text-whisper py-4 text-center">Loading audit records...</p>
      ) : filteredLogs.length === 0 ? (
        <p className="text-xs text-whisper py-4 text-center">No audit records found.</p>
      ) : (
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-fog text-graphite border-b border-ash font-semibold sticky top-0">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
                <th className="p-3">Reason / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-fog/50">
                  <td className="p-3 text-whisper text-[11px] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <p className="font-semibold text-onyx">{log.actorName || 'System'}</p>
                    <p className="text-[10px] text-graphite font-mono">{log.actorRole}</p>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-graphite">
                    <span className="font-semibold">{log.entityType}</span>
                    {log.entityId && <span className="block text-[10px] text-whisper font-mono truncate max-w-[120px]">{log.entityId}</span>}
                  </td>
                  <td className="p-3 text-graphite max-w-xs">
                    <p className="line-clamp-2">{log.reason || 'System operation executed'}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
};