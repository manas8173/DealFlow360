import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setAuthToken, setStoredUser } from '../api';
import { Sparkles, ArrowRight, ShieldCheck, Building2, ArrowLeft } from 'lucide-react';

export const CustomerLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('customer@acme.demo');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login({ email, password });
      if (res.user.role !== 'CUSTOMER') {
        setError('This portal is for customer organizations. Staff members should use the main Sign In page.');
        return;
      }
      setAuthToken(res.token);
      setStoredUser(res.user);
      navigate('/customer-portal');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoCustomer = () => {
    setLoading(true);
    setError(null);
    api.login({ email: 'customer@acme.demo', password: 'Password123!' })
      .then((res) => {
        setAuthToken(res.token);
        setStoredUser(res.user);
        navigate('/customer-portal');
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen bg-white text-onyx flex flex-col justify-center items-center p-6">
      <div className="max-w-page w-full grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left Info Box */}
        <div className="flex flex-col justify-center space-y-8">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lilacmist border border-violet-100 text-violet-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              Customer Organization Portal
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-onyx flex items-center justify-center text-white">
                <Building2 className="w-4 h-4 text-violet-400" />
              </div>
              <h1 className="text-2xl font-extrabold font-display tracking-tight text-onyx">DealFlow360</h1>
            </div>

            <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-onyx leading-[1.05] max-w-lg">
              Your quotations, negotiations &amp; renewals in one place.
            </h2>
            <p className="text-graphite text-sm leading-relaxed max-w-md">
              View your company's quotations, accept approved quotes, negotiate counter offers, track order fulfillment, and manage subscription renewals.
            </p>
          </div>

          {/* Demo Customer */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider font-bold text-graphite flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-violet-600" />
              Demo Customer Access
            </p>
            <button
              type="button"
              onClick={handleDemoCustomer}
              disabled={loading}
              className="w-full text-left p-3 rounded-lg bg-white border border-ash hover:border-violet-400/40 shadow-sm transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-sm font-semibold text-onyx group-hover:text-violet-700 transition-colors">Acme Corporation (customer@acme.demo)</p>
                <p className="text-xs text-graphite">View quotations, negotiate & confirm orders</p>
              </div>
              <ArrowRight className="w-4 h-4 text-whisper group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>

        {/* Right Login Form */}
        <div className="flex flex-col justify-center">
          <div className="bg-white border border-ash rounded-cards p-8 shadow-sm space-y-6">
            <div className="space-y-1">
              <h3 className="text-2xl font-display font-bold text-onyx tracking-tight">Customer Sign In</h3>
              <p className="text-sm text-graphite">Sign in with your company email and password</p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal">Company Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Authenticating...' : 'Sign In to Customer Portal'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-ash"></div>
              <span className="text-[10px] uppercase tracking-wider text-whisper font-bold">or</span>
              <div className="flex-1 h-px bg-ash"></div>
            </div>

            <Link
              to="/signup?type=customer"
              className="btn-ghost w-full"
            >
              <Building2 className="w-4 h-4" />
              New Customer? Create Account
            </Link>

            <div className="pt-2 border-t border-ash flex items-center justify-between">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-graphite hover:text-onyx transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Staff Sign In
              </Link>
              <p className="text-[11px] text-whisper flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-signal" />
                Role-Based Access Enforced
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};