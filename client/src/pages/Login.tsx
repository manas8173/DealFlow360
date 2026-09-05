import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setAuthToken, setStoredUser } from '../api';
import { Sparkles, ArrowRight, ShieldCheck, UserCheck, ExternalLink } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('rep@dealflow360.demo');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  const handleQuickLogin = (targetEmail: string) => {
    setEmail(targetEmail);
    setPassword('Password123!');
    setTimeout(() => {
      api.login({ email: targetEmail, password: 'Password123!' }).then((res) => {
        setAuthToken(res.token);
        setStoredUser(res.user);
        if (res.user.role === 'CUSTOMER') {
          navigate('/customer-portal');
        } else {
          navigate('/dashboard');
        }
      }).catch((err) => setError(err.message));
    }, 100);
  };

  const demoAccounts = [
    { title: 'Sales Representative', email: 'rep@dealflow360.demo', role: 'SALES_REP', desc: 'Create & submit quotes, view upsells' },
    { title: 'Sales Manager', email: 'manager@dealflow360.demo', role: 'SALES_MANAGER', desc: 'Approve/return discount overages' },
    { title: 'Finance Operations', email: 'finance@dealflow360.demo', role: 'FINANCE_OPERATIONS', desc: '2nd-level approval, fulfillment, billing' },
    { title: 'Administrator', email: 'admin@dealflow360.demo', role: 'ADMIN', desc: 'Full governance & catalog configuration' },
  ];

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

          {/* Staff Roles */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider font-bold text-graphite flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-signal" />
              Staff Sign In
            </p>
            <div className="space-y-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email)}
                  className="w-full text-left p-3 rounded-lg bg-white border border-ash hover:border-signal/40 shadow-sm transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-sm font-semibold text-onyx group-hover:text-signal transition-colors">
                      {acc.title}
                    </p>
                    <p className="text-xs text-graphite">{acc.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-whisper group-hover:text-signal group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Login Form */}
        <div className="flex flex-col justify-center">
          <div className="bg-white border border-ash rounded-cards p-8 shadow-sm space-y-6">
            <div className="space-y-1">
              <h3 className="text-2xl font-display font-bold text-onyx tracking-tight">Sign In to Platform</h3>
              <p className="text-sm text-graphite">Enter your credentials or use a staff role shortcut</p>
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

            <div className="pt-2 border-t border-ash text-center">
              <p className="text-[11px] text-whisper flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-signal" />
                Role-Based Access & Server-Side Security Enforced
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};