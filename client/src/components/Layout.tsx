import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Truck,
  Repeat,
  Receipt,
  Activity,
  BarChart3,
  LogOut,
  RefreshCw,
  Sparkles,
  Settings,
  Shield,
  Inbox,
  Warehouse,
} from 'lucide-react';
import { api, getStoredUser, clearAuthToken } from '../api';
import { useToast } from './Toast';
import { NotificationCenter } from './NotificationCenter';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [isResetting, setIsResetting] = useState(false);

  const handleLogout = () => {
    clearAuthToken();
    navigate('/login');
  };

  const handleResetDatabase = async () => {
    if (!confirm('Reset database to default seed data?')) return;
    try {
      setIsResetting(true);
      await api.resetDatabase();
      toast.success('Database successfully reset and re-seeded!');
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      toast.error('Database reset error: ' + e.message);
    } finally {
      setIsResetting(false);
    }
  };

  const isCustomer = currentUser?.role === 'CUSTOMER';
  const role = currentUser?.role || 'SALES_REP';

  const navItems = (() => {
    if (isCustomer) {
      return [{ label: 'My Quotations', path: '/customer-portal', icon: FileText }];
    }
    switch (role) {
      case 'FINANCE_OPERATIONS':
        return [
          { label: 'Approvals', path: '/approvals', icon: CheckSquare },
          { label: 'Warehouse Stock', path: '/inventory', icon: Warehouse },
          { label: 'Fulfillment', path: '/fulfillment', icon: Truck },
          { label: 'Invoices & Billing', path: '/invoices', icon: Receipt },
        ];
      case 'SALES_MANAGER':
        return [
          { label: 'Quotations', path: '/quotations', icon: FileText },
          { label: 'Requests', path: '/quote-requests', icon: Inbox },
          { label: 'Approvals', path: '/approvals', icon: CheckSquare },
          { label: 'Warehouse Stock', path: '/inventory', icon: Warehouse },
          { label: 'Deal Health', path: '/deal-health', icon: Activity },
          { label: 'Discount Governance', path: '/discount-governance', icon: BarChart3 },
        ];
      case 'ADMIN':
        return [
          { label: 'Admin Console', path: '/admin', icon: Settings },
          { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { label: 'Quotations', path: '/quotations', icon: FileText },
          { label: 'Requests', path: '/quote-requests', icon: Inbox },
          { label: 'Approvals', path: '/approvals', icon: CheckSquare },
          { label: 'Discount Governance', path: '/discount-governance', icon: BarChart3 },
          { label: 'Warehouse Stock', path: '/inventory', icon: Warehouse },
          { label: 'Fulfillment', path: '/fulfillment', icon: Truck },
          { label: 'Invoices & Billing', path: '/invoices', icon: Receipt },
          { label: 'Deal Health', path: '/deal-health', icon: Activity },
          { label: 'Reports', path: '/reports', icon: BarChart3 },
        ];
      case 'SALES_REP':
      default:
        return [
          { label: 'Deal Command Center', path: '/dashboard', icon: LayoutDashboard },
          { label: 'Requests', path: '/quote-requests', icon: Inbox },
          { label: 'Commercial Quotations', path: '/quotations', icon: FileText },
          { label: 'Approvals Tracker', path: '/approvals', icon: CheckSquare },
          { label: 'Warehouse Stock', path: '/inventory', icon: Warehouse },
          { label: 'Fulfillment Status', path: '/fulfillment', icon: Truck },
          { label: 'Invoices & Billing', path: '/invoices', icon: Receipt },
        ];
    }
  })();

  const roleHomePath = (() => {
    if (isCustomer) return '/customer-portal';
    switch (role) {
      case 'SALES_MANAGER':
      case 'FINANCE_OPERATIONS':
        return '/approvals';
      case 'ADMIN':
      case 'SALES_REP':
      default:
        return '/dashboard';
    }
  })();

  return (
    <div className="min-h-screen bg-canvas text-onyx flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-ash flex flex-col shrink-0">
        <div className="p-4 border-b border-ash flex items-center justify-between">
          <Link to={roleHomePath} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-onyx flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-extrabold font-display tracking-tight text-onyx text-base leading-none">DealFlow360</h1>
              <p className="text-[10px] text-signal font-semibold tracking-wider uppercase mt-0.5">Deal Engine Platform</p>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-signal border border-emerald-100'
                    : 'text-graphite hover:text-onyx hover:bg-fog'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-signal' : 'text-whisper'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer User Profile & Reset */}
        <div className="p-3 border-t border-ash space-y-2">
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={handleResetDatabase}
              disabled={isResetting}
              className="btn-danger-ghost w-full"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? 'Resetting DB...' : 'Reset Database'}</span>
            </button>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-fog border border-ash flex items-center justify-center text-xs font-bold text-onyx shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-onyx truncate">{currentUser.name}</p>
                <p className="text-[10px] text-whisper font-mono truncate">{currentUser.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-whisper hover:text-crimson hover:bg-fog rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-ash px-6 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-onyx tracking-tight">
              {location.pathname.replace('/', '').toUpperCase() || 'DASHBOARD'}
            </h2>
            <span className="text-xs px-2 py-0.5 bg-fog text-charcoal rounded-full font-mono">v1.0</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Active User Session */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-fog px-3 py-1.5 rounded-xl border border-ash text-xs">
                <span className="font-semibold text-onyx">{currentUser.name}</span>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-white border border-ash text-signal">
                  {currentUser.role}
                </span>
              </div>
            )}

            <NotificationCenter />

            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 text-xs">
              <span className="w-2 h-2 rounded-full bg-signal animate-pulse"></span>
              <span className="text-emerald-700 font-medium">Service Online</span>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
};