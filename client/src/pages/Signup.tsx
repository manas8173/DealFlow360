import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import { Sparkles, ArrowRight, Briefcase, Building2, ShieldCheck, UserPlus, CheckCircle2, ArrowLeft } from 'lucide-react';

type SignupType = 'employee' | 'customer';

const employeeRoles = [
  { value: 'SALES_REP', label: 'Sales Representative' },
  { value: 'SALES_MANAGER', label: 'Sales Manager' },
  { value: 'FINANCE_OPERATIONS', label: 'Finance Operations' },
];

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType: SignupType = searchParams.get('type') === 'customer' ? 'customer' : 'employee';
  const [type, setType] = useState<SignupType>(initialType);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empRole, setEmpRole] = useState('SALES_REP');
  const [empCompany, setEmpCompany] = useState('');

  const [custCompany, setCustCompany] = useState('');
  const [custCompanyEmail, setCustCompanyEmail] = useState('');
  const [custContactName, setCustContactName] = useState('');
  const [custPassword, setCustPassword] = useState('');

  const switchType = (nextType: SignupType) => {
    setType(nextType);
    setError(null);
    setSuccessMessage(null);
  };

  const handleEmployeeSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.registerEmployee({
        name: empName,
        email: empEmail,
        password: empPassword,
        role: empRole,
        company: empCompany,
      });
      setSuccessMessage(res.message || 'Sign-up submitted. Your account is pending approval by an administrator.');
    } catch (err: any) {
      setError(err.message || 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.registerCustomer({
        companyName: custCompany,
        companyEmail: custCompanyEmail,
        contactName: custContactName,
        password: custPassword,
      });
      setSuccessMessage(res.message || 'Customer account created successfully. You can now sign in with your company email.');
    } catch (err: any) {
      setError(err.message || 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-onyx flex flex-col justify-center items-center p-6">
      <div className="max-w-2xl w-full">
        <div className="flex flex-col items-center text-center mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-fog border border-ash rounded-full text-graphite text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-signal" />
            B2B Sales Operations Platform
          </div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-onyx">Create Your Account</h1>
          <p className="text-graphite text-sm">
            Join the DealFlow360 platform as an employee or a customer organization.
          </p>
        </div>

        <div className="bg-white border border-ash rounded-cards p-6 shadow-sm space-y-5">
          {/* Type Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-fog border border-ash rounded-xl">
            <button
              type="button"
              onClick={() => switchType('employee')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                type === 'employee' ? 'bg-signal text-white shadow-sm' : 'text-graphite hover:text-onyx'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Employee
            </button>
            <button
              type="button"
              onClick={() => switchType('customer')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                type === 'customer' ? 'bg-violet-600 text-white shadow-sm' : 'text-graphite hover:text-onyx'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Customer Organization
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600 font-medium">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-emerald-700">Registration Received</p>
                  <p className="text-xs leading-relaxed text-graphite">{successMessage}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="btn-primary flex-1"
                >
                  Go to Sign In
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                {type === 'employee' && (
                  <button
                    type="button"
                    onClick={() => setSuccessMessage(null)}
                    className="btn-ghost flex-1"
                  >
                    Register Another Employee
                  </button>
                )}
              </div>
            </div>
          )}

          {!successMessage && type === 'employee' && (
            <form onSubmit={handleEmployeeSignup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal">Full Name</label>
                <input
                  type="text"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="input"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal">Work Email</label>
                <input
                  type="email"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  placeholder="e.g. priya@company.com"
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-charcoal">Desired Role</label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    className="input"
                  >
                    {employeeRoles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-charcoal">Company (optional)</label>
                  <input
                    type="text"
                    value={empCompany}
                    onChange={(e) => setEmpCompany(e.target.value)}
                    placeholder="e.g. DealFlow Solutions"
                    className="input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal">Password</label>
                <input
                  type="password"
                  value={empPassword}
                  onChange={(e) => setEmpPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  className="input"
                  required
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700 flex items-start gap-2">
                <UserPlus className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Your employee account will be created in <strong>pending</strong> status. An administrator must approve your
                  sign-up request before you can sign in.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Submitting...' : 'Submit for Admin Approval'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {!successMessage && type === 'customer' && (
            <form onSubmit={handleCustomerSignup} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-charcoal">Company Name</label>
                  <input
                    type="text"
                    value={custCompany}
                    onChange={(e) => setCustCompany(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="input"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-charcoal">Company Email</label>
                  <input
                    type="email"
                    value={custCompanyEmail}
                    onChange={(e) => setCustCompanyEmail(e.target.value)}
                    placeholder="e.g. contact@acme.com"
                    className="input"
                    required
                  />
                  <p className="text-[10px] text-whisper">Your company email will be used to sign in.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-charcoal">Contact Person Name</label>
                  <input
                    type="text"
                    value={custContactName}
                    onChange={(e) => setCustContactName(e.target.value)}
                    placeholder="e.g. Rohan Mehta"
                    className="input"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-charcoal">Password</label>
                  <input
                    type="password"
                    value={custPassword}
                    onChange={(e) => setCustPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg text-[11px] text-violet-700 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Your customer organization is created immediately with a <strong>BRONZE</strong> tier. You can sign in right away
                  with your company email to view quotations and negotiate directly through the Customer Portal.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Creating Account...' : 'Create Customer Account'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-ash">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-graphite hover:text-onyx transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </Link>
            <p className="text-[11px] text-whisper flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-signal" />
              Role-Based Access & Server-Side Security Enforced
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};