import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserPlus,
  Truck,
  Receipt,
  Check,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { api, getStoredUser } from '../api';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  timestamp: string;
  link: string;
  iconType: 'user' | 'approval' | 'quote' | 'fulfillment' | 'invoice' | 'health' | 'audit';
  read?: boolean;
}

export const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const user = getStoredUser();
  const role = user?.role || 'SALES_REP';

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const items: SystemNotification[] = [];

    try {
      if (role === 'ADMIN') {
        const [signupRes, auditRes, alertsRes] = await Promise.allSettled([
          api.getSignupRequests(),
          api.getAuditLogs(),
          api.getDealHealthAlerts(),
        ]);

        if (signupRes.status === 'fulfilled' && Array.isArray(signupRes.value)) {
          const pending = signupRes.value.filter((r: any) => r.status === 'PENDING_APPROVAL');
          pending.forEach((req: any) => {
            items.push({
              id: `signup-${req.id}`,
              title: 'Employee Approval Required',
              message: `${req.name} (${req.email}) registered as ${req.role}. Decision pending.`,
              type: 'warning',
              timestamp: req.createdAt,
              link: '/admin',
              iconType: 'user',
            });
          });
        }

        if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value)) {
          alertsRes.value.forEach((alt: any) => {
            if (alt.status === 'ESCALATED') {
              items.push({
                id: `admin-esc-${alt.id}`,
                title: `🚨 Deal Escalated: ${alt.quotation?.quoteNumber || 'Quotation'}`,
                message: `VP Escalation on ${alt.quotation?.customer?.name || 'customer'}: ${alt.message}`,
                type: 'danger',
                timestamp: alt.updatedAt || alt.createdAt,
                link: '/deal-health',
                iconType: 'health',
              });
            } else if (alt.status === 'ACTIVE' && (alt.severity === 'HIGH' || alt.severity === 'CRITICAL')) {
              items.push({
                id: `admin-alt-${alt.id}`,
                title: `Deal Health: ${alt.alertType}`,
                message: alt.message || `Alert on ${alt.quotation?.quoteNumber}`,
                type: 'warning',
                timestamp: alt.createdAt,
                link: '/deal-health',
                iconType: 'health',
              });
            }
          });
        }

        if (auditRes.status === 'fulfilled' && Array.isArray(auditRes.value)) {
          auditRes.value.slice(0, 3).forEach((log: any) => {
            items.push({
              id: `audit-${log.id}`,
              title: `Audit: ${log.action}`,
              message: log.reason || `${log.actorName} performed ${log.action} on ${log.entityType}`,
              type: 'info',
              timestamp: log.createdAt,
              link: '/admin',
              iconType: 'audit',
            });
          });
        }
      } else if (role === 'SALES_MANAGER') {
        const [approvalsRes, alertsRes] = await Promise.allSettled([
          api.getApprovals(),
          api.getDealHealthAlerts(),
        ]);

        if (approvalsRes.status === 'fulfilled' && Array.isArray(approvalsRes.value)) {
          const pending = approvalsRes.value.filter((a: any) => a.status === 'PENDING');
          pending.forEach((app: any) => {
            items.push({
              id: `approval-${app.id}`,
              title: 'Quote Approval Pending',
              message: `Quotation ${app.quotation?.quoteNumber || ''} for ${app.quotation?.customer?.name || 'client'} requires review.`,
              type: 'warning',
              timestamp: app.createdAt,
              link: '/approvals',
              iconType: 'approval',
            });
          });
        }

        if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value)) {
          alertsRes.value.forEach((alt: any) => {
            if (alt.status === 'ESCALATED') {
              items.push({
                id: `mgr-esc-${alt.id}`,
                title: `🚨 Escalated to VP: ${alt.quotation?.quoteNumber || 'Quotation'}`,
                message: `High-priority escalation for ${alt.quotation?.customer?.name || 'customer'}: ${alt.message}`,
                type: 'danger',
                timestamp: alt.updatedAt || alt.createdAt,
                link: '/deal-health',
                iconType: 'health',
              });
            } else if (alt.status === 'NUDGED') {
              items.push({
                id: `mgr-nudge-${alt.id}`,
                title: `Nudge Sent: ${alt.quotation?.quoteNumber || alt.alertType}`,
                message: `Rep alerted for ${alt.quotation?.customer?.name || 'deal'}. Awaiting rep action.`,
                type: 'info',
                timestamp: alt.updatedAt || alt.createdAt,
                link: '/deal-health',
                iconType: 'health',
              });
            } else if (alt.status === 'ACTIVE') {
              items.push({
                id: `alert-${alt.id}`,
                title: `Deal Health: ${alt.alertType}`,
                message: alt.message || `Quotation ${alt.quotation?.quoteNumber || ''} flagged.`,
                type: alt.severity === 'CRITICAL' || alt.severity === 'HIGH' ? 'danger' : 'warning',
                timestamp: alt.createdAt,
                link: '/deal-health',
                iconType: 'health',
              });
            }
          });
        }
      } else if (role === 'FINANCE_OPERATIONS') {
        const [ordersRes, invoicesRes, approvalsRes] = await Promise.allSettled([
          api.getFulfillmentOrders(),
          api.getInvoices(),
          api.getApprovals(),
        ]);

        if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value)) {
          const pendingOrders = ordersRes.value.filter((o: any) => o.status === 'PENDING' || o.status === 'PARTIALLY_ALLOCATED');
          pendingOrders.forEach((ord: any) => {
            items.push({
              id: `fulfill-${ord.id}`,
              title: 'Order Awaiting Fulfillment',
              message: `Order for ${ord.quotation?.customer?.name || 'client'} has unallocated lines.`,
              type: 'warning',
              timestamp: ord.createdAt,
              link: '/fulfillment',
              iconType: 'fulfillment',
            });
          });
        }

        if (invoicesRes.status === 'fulfilled' && Array.isArray(invoicesRes.value)) {
          const openInvoices = invoicesRes.value.filter((inv: any) => inv.status === 'ISSUED');
          openInvoices.slice(0, 3).forEach((inv: any) => {
            items.push({
              id: `inv-${inv.id}`,
              title: `Invoice ${inv.invoiceNumber} Issued`,
              message: `Total ₹${inv.totalAmount?.toLocaleString()} awaiting payment from ${inv.customer?.name || 'customer'}.`,
              type: 'info',
              timestamp: inv.createdAt,
              link: '/invoices',
              iconType: 'invoice',
            });
          });
        }

        if (approvalsRes.status === 'fulfilled' && Array.isArray(approvalsRes.value)) {
          const pendingApprovals = approvalsRes.value.filter((a: any) => a.status === 'PENDING');
          pendingApprovals.forEach((app: any) => {
            items.push({
              id: `fin-app-${app.id}`,
              title: 'Finance Sign-Off Required',
              message: `Commercial terms approval requested for ${app.quotation?.quoteNumber}.`,
              type: 'warning',
              timestamp: app.createdAt,
              link: '/approvals',
              iconType: 'approval',
            });
          });
        }
      } else if (role === 'CUSTOMER') {
        const portalRes = await Promise.allSettled([api.getPortalQuotations()]);
        if (portalRes[0].status === 'fulfilled' && Array.isArray(portalRes[0].value)) {
          portalRes[0].value.forEach((q: any) => {
            if (q.status === 'SENT') {
              items.push({
                id: `cust-quote-${q.id}`,
                title: 'New Quotation Received',
                message: `Quotation ${q.quoteNumber} (₹${q.totalAmount?.toLocaleString()}) is available for review and sign-off.`,
                type: 'success',
                timestamp: q.updatedAt || q.createdAt,
                link: '/customer-portal',
                iconType: 'quote',
              });
            }
          });
        }
      } else {
        // SALES_REP
        const [quotesRes, alertsRes] = await Promise.allSettled([
          api.getQuotations(),
          api.getDealHealthAlerts(),
        ]);

        if (quotesRes.status === 'fulfilled' && Array.isArray(quotesRes.value)) {
          quotesRes.value.forEach((q: any) => {
            if (q.status === 'APPROVED') {
              items.push({
                id: `rep-app-${q.id}`,
                title: `Quotation ${q.quoteNumber} Approved!`,
                message: `Your quote for ${q.customer?.name} was approved. You can now send it to the customer.`,
                type: 'success',
                timestamp: q.updatedAt,
                link: `/quotations/${q.id}`,
                iconType: 'quote',
              });
            } else if (q.status === 'REJECTED') {
              items.push({
                id: `rep-rej-${q.id}`,
                title: `Quotation ${q.quoteNumber} Returned/Rejected`,
                message: `Discount threshold exceeded or policy revision requested.`,
                type: 'danger',
                timestamp: q.updatedAt,
                link: `/quotations/${q.id}`,
                iconType: 'quote',
              });
            }
          });
        }

        if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value)) {
          alertsRes.value.forEach((alt: any) => {
            if (alt.status === 'NUDGED') {
              items.push({
                id: `rep-nudge-${alt.id}`,
                title: `⚠️ Manager Nudge: Action Required on ${alt.quotation?.quoteNumber || alt.alertType}`,
                message: `Sales Manager requested prompt follow-up on ${alt.quotation?.customer?.name || 'deal'}: ${alt.message}`,
                type: 'warning',
                timestamp: alt.updatedAt || alt.createdAt,
                link: alt.quotation?.id ? `/quotations/${alt.quotation.id}` : '/deal-health',
                iconType: 'health',
              });
            } else if (alt.status === 'ESCALATED') {
              items.push({
                id: `rep-esc-${alt.id}`,
                title: `🚨 Deal Escalated: ${alt.quotation?.quoteNumber || alt.alertType}`,
                message: `Quote for ${alt.quotation?.customer?.name || 'customer'} escalated to Sales VP: ${alt.message}`,
                type: 'danger',
                timestamp: alt.updatedAt || alt.createdAt,
                link: alt.quotation?.id ? `/quotations/${alt.quotation.id}` : '/deal-health',
                iconType: 'health',
              });
            } else if (alt.status === 'ACTIVE') {
              items.push({
                id: `rep-alt-${alt.id}`,
                title: `Deal Health Warning: ${alt.alertType}`,
                message: alt.message || `Action recommended on quote ${alt.quotation?.quoteNumber || ''}`,
                type: alt.severity === 'HIGH' || alt.severity === 'CRITICAL' ? 'danger' : 'warning',
                timestamp: alt.createdAt,
                link: '/deal-health',
                iconType: 'health',
              });
            }
          });
        }
      }

      // Sort newest first
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(items);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [role]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllAsRead = () => {
    const newSet = new Set(readIds);
    notifications.forEach((n) => newSet.add(n.id));
    setReadIds(newSet);
  };

  const handleItemClick = (n: SystemNotification) => {
    setReadIds((prev) => new Set([...prev, n.id]));
    setIsOpen(false);
    navigate(n.link);
  };

  const renderIcon = (iconType: string, type: string) => {
    const color =
      type === 'danger'
        ? 'text-rose-600 bg-rose-50 border-rose-200'
        : type === 'warning'
        ? 'text-amber-600 bg-amber-50 border-amber-200'
        : type === 'success'
        ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
        : 'text-signal bg-emerald-50 border-emerald-100';

    switch (iconType) {
      case 'user':
        return (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${color}`}>
            <UserPlus className="w-4 h-4" />
          </div>
        );
      case 'approval':
        return (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${color}`}>
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'quote':
        return (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${color}`}>
            <FileText className="w-4 h-4" />
          </div>
        );
      case 'fulfillment':
        return (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${color}`}>
            <Truck className="w-4 h-4" />
          </div>
        );
      case 'invoice':
        return (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${color}`}>
            <Receipt className="w-4 h-4" />
          </div>
        );
      case 'health':
        return (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${color}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'audit':
      default:
        return (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${color}`}>
            <ShieldAlert className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-graphite hover:text-onyx hover:bg-fog transition-colors"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-ash rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-ash flex items-center justify-between bg-fog/60">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-onyx">System Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-signal hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-ash">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-whisper">Checking for updates...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-onyx">All caught up!</p>
                <p className="text-[11px] text-graphite">No action items pending for your role right now.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !readIds.has(n.id);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`w-full text-left p-3 flex items-start gap-3 transition-colors ${
                      isUnread ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-fog/60'
                    }`}
                  >
                    {renderIcon(n.iconType, n.type)}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-semibold truncate ${isUnread ? 'text-onyx font-bold' : 'text-graphite'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-whisper whitespace-nowrap">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-graphite line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <div className="pt-0.5 flex items-center gap-1 text-[10px] font-semibold text-signal">
                        <span>View Details</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    </div>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-signal shrink-0 mt-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-ash bg-fog/30 text-center">
            <span className="text-[10px] text-whisper">
              Live updates active for role: <strong className="font-mono text-graphite">{role}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
