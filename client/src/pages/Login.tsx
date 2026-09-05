import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setAuthToken, setStoredUser } from '../api';
import { Sparkles, ArrowRight, ShieldCheck, ExternalLink, Shield, Layers, Receipt } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await api.login({ email, password });
      setAuthToken(res.token);
      setStoredUser(res.user);

      if (res.user.role === 'CUSTOMER') {
        navigate('/customer-portal');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-onyx flex flex-col justify-center items-center p-6">
      <div className="max-w-page w-full grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left Info Box */}
        <div className="flex flex-col justify-center space-y-8">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fog border border-ash text-graphite text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-signal" />
              B2B Sales Operations Platform
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-onyx flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-extrabold font-display tracking-tight text-onyx">DealFlow360</h1>
            </div>

            <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-onyx leading-[1.05] max-w-lg">
              Intelligent, self-governing B2B sales operations.
            </h2>
            <p className="text-graphite text-sm leading-relaxed max-w-md">
              Quotations, discount governance, blended risk calculation, fulfillment, and hybrid billing — unified in a single console.
            </p>
          </div>

          {/* Platform Highlights */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-fog border border-ash">
              <Shield className="w-4 h-4 text-signal mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-onyx">Self-Governing Discount Controls</p>
                <p className="text-[11px] text-graphite">Enforce commercial policies with automatic risk scoring and margin safeguards.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-fog border border-ash">
              <Layers className="w-4 h-4 text-signal mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-onyx">Multi-Tier Approval Routing</p>
                <p className="text-[11px] text-graphite">Streamline sign-offs across sales leadership and finance operations.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-fog border border-ash">
              <Receipt className="w-4 h-4 text-signal mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-onyx">Invoicing & Warehouse Fulfillment</p>
                <p className="text-[11px] text-graphite">Multi-warehouse stock reservation alongside automated commercial invoicing.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Login Form */}
        <div className="flex flex-col justify-center">
          <div className="bg-white border border-ash rounded-cards p-8 shadow-sm space-y-6">
            <div className="space-y-1">
              <h3 className="text-2xl font-display font-bold text-onyx tracking-tight">Sign In to Platform</h3>
              <p className="text-sm text-graphite">Enter your email and password to access your account</p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal">Email Address</label>
                <input
                  type="email"
                  value={email}
                  placeholder="name@company.com"
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }}
                  className={`input ${fieldErrors.email ? 'border-rose-400' : ''}`}
                />
                {fieldErrors.email && <p className="text-[11px] text-rose-600">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal">Password</label>
                <input
                  type="password"
                  value={password}
                  placeholder="••••••••"
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })); }}
                  className={`input ${fieldErrors.password ? 'border-rose-400' : ''}`}
                />
                {fieldErrors.password && <p className="text-[11px] text-rose-600">{fieldErrors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-ash"></div>
              <span className="text-[10px] uppercase tracking-wider text-whisper font-bold">or</span>
              <div className="flex-1 h-px bg-ash"></div>
            </div>

            <Link
              to="/customer-login"
              className="btn-ghost w-full"
            >
              <ExternalLink className="w-4 h-4" />
              Customer Portal Sign In
            </Link>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Link
                to="/signup?type=employee"
                className="flex-1 text-center px-3 py-2.5 bg-fog hover:bg-gray-200 border border-ash text-charcoal rounded-buttons text-xs font-semibold transition-colors"
              >
                Create Employee Account
              </Link>
              <Link
                to="/signup?type=customer"
                className="flex-1 text-center px-3 py-2.5 bg-fog hover:bg-gray-200 border border-ash text-charcoal rounded-buttons text-xs font-semibold transition-colors"
              >
                Create Customer Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};