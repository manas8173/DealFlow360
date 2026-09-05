import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Shield, Layers, Gavel, AlertTriangle } from 'lucide-react';

import { useToast } from '../components/Toast';

const RISK_INFO: Record<string, { label: string; desc: string; tone: string }> = {
  LOW: { label: 'Low Risk', desc: 'Below standard thresholds — single approver step', tone: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  MEDIUM: { label: 'Medium Risk', desc: 'Over-threshold — requires manager approval', tone: 'text-amber-600 bg-amber-50 border-amber-200' },
  HIGH: { label: 'High Risk', desc: 'Large overage — escalated multi-step chain', tone: 'text-rose-600 bg-rose-50 border-rose-200' },
};

export const DiscountGovernance: React.FC = () => {
  const toast = useToast();
  const [tiers, setTiers] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.getDiscountPolicy();
      setTiers(data?.tiers || []);
      setPolicies(data?.approvalPolicies || []);
    } catch (e: any) {
      toast.error('Failed to load discount policy: ' + e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const updateTier = async (tier: string, maxDiscountPercent: number) => {
    try {
      await api.updateTierLimit(tier, maxDiscountPercent);
      toast.success(`Updated ${tier} tier max discount to ${maxDiscountPercent}%`);
      load();
    } catch (e: any) {
      toast.error('Tier update failed: ' + e.message);
    }
  };

  const updatePolicy = async (riskBand: string, data: any) => {
    try {
      await api.updateApprovalPolicy(riskBand, data);
      toast.success(`Updated ${riskBand} risk approval policy`);
      load();
    } catch (e: any) {
      toast.error('Approval chain update failed: ' + e.message);
    }
  };

  const toggleRole = (riskBand: string, current: string[], role: string) => {
    const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    if (next.length === 0) return toast.warning('At least one approver role is required');
    updatePolicy(riskBand, { rolesRequired: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-onyx flex items-center gap-2">
          <Shield className="w-5 h-5 text-signal" />
          Discount Governance
        </h2>
        <p className="text-xs text-graphite">Manager console — tune customer tier discount ceilings and approval chains for each risk band</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-whisper">Loading governance policy...</div>
      ) : (
        <>
          {/* Tier Limits */}
          <div className="bg-white border border-ash rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-signal" />
              <h3 className="text-sm font-bold text-onyx">Customer Tier Discount Ceilings</h3>
            </div>
            <div className="space-y-2">
              {tiers.map((t: any) => (
                <div key={t.tier} className="flex items-center justify-between p-3 bg-fog rounded-lg border border-ash text-xs">
                  <div>
                    <p className="font-bold text-onyx uppercase">{t.tier}</p>
                    <p className="text-[10px] text-whisper">Max discount a rep may offer this tier</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      defaultValue={t.maxDiscountPercent}
                      className="input rounded-lg px-2 py-1 text-xs w-24 font-mono font-bold text-center"
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0 && val <= 100 && val !== Number(t.maxDiscountPercent)) {
                          updateTier(t.tier, val);
                        }
                      }}
                    />
                    <span className="text-whisper text-[10px]">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Approval Chains */}
          <div className="bg-white border border-ash rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Gavel className="w-4 h-4 text-signal" />
              <h3 className="text-sm font-bold text-onyx">Approval Chains by Risk Band</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {policies.map((p: any) => {
                const roles = typeof p.rolesRequired === 'string' ? JSON.parse(p.rolesRequired) : (p.rolesRequired || []);
                const info = RISK_INFO[p.riskBand] || RISK_INFO.MEDIUM;
                return (
                  <div key={p.riskBand} className={`rounded-lg border p-4 space-y-3 ${info.tone.split(' ').slice(1).join(' ')}`}>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${info.tone}`}>
                      <AlertTriangle className="w-3 h-3" />
                      {info.label}
                    </div>
                    <p className="text-[11px] text-charcoal">{info.desc}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-white/70 border border-black/5 rounded">
                        <p className="text-[9px] uppercase text-whisper font-bold">Min Score</p>
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={p.minScore}
                          className="w-full bg-transparent font-mono font-bold text-onyx mt-0.5 focus:outline-none"
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val !== Number(p.minScore)) {
                              updatePolicy(p.riskBand, { minScore: val });
                            }
                          }}
                        />
                      </div>
                      <div className="p-2 bg-white/70 border border-black/5 rounded">
                        <p className="text-[9px] uppercase text-whisper font-bold">Max Score</p>
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={p.maxScore}
                          className="w-full bg-transparent font-mono font-bold text-onyx mt-0.5 focus:outline-none"
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val !== Number(p.maxScore)) {
                              updatePolicy(p.riskBand, { maxScore: val });
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[9px] uppercase text-whisper font-bold">Required Approver Roles</p>
                      {['SALES_MANAGER', 'FINANCE_OPERATIONS'].map((role) => (
                        <label key={role} className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={roles.includes(role)}
                            onChange={() => toggleRole(p.riskBand, roles, role)}
                          />
                          {role.replace('_', ' / ')}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-whisper">Updates are audit-logged and take effect the moment the next quotation is submitted.</p>
          </div>
        </>
      )}
    </div>
  );
};