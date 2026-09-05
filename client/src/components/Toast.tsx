import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// ── Context ───────────────────────────────────────────────────────────────────

interface ToastContextValue {
  addToast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

export const ToastContext = React.createContext<ToastContextValue>({
  addToast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const success = useCallback((msg: string) => addToast('success', msg), [addToast]);
  const error = useCallback((msg: string) => addToast('error', msg), [addToast]);
  const warning = useCallback((msg: string) => addToast('warning', msg), [addToast]);
  const info = useCallback((msg: string) => addToast('info', msg), [addToast]);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ addToast, success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxWidth: '24rem',
          width: '100%',
        }}
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast() {
  return React.useContext(ToastContext);
}

// ── Toast Item ────────────────────────────────────────────────────────────────

const STYLES: Record<ToastType, { bg: string; border: string; icon: React.ReactNode }> = {
  success: {
    bg: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
    border: '#16a34a',
    icon: <CheckCircle style={{ color: '#4ade80', flexShrink: 0 }} size={18} />,
  },
  error: {
    bg: 'linear-gradient(135deg, #2d0a0a 0%, #450a0a 100%)',
    border: '#dc2626',
    icon: <XCircle style={{ color: '#f87171', flexShrink: 0 }} size={18} />,
  },
  warning: {
    bg: 'linear-gradient(135deg, #1c1007 0%, #2d1b00 100%)',
    border: '#d97706',
    icon: <AlertTriangle style={{ color: '#fbbf24', flexShrink: 0 }} size={18} />,
  },
  info: {
    bg: 'linear-gradient(135deg, #0c1a2e 0%, #0f2545 100%)',
    border: '#2563eb',
    icon: <Info style={{ color: '#60a5fa', flexShrink: 0 }} size={18} />,
  },
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const style = STYLES[toast.type];

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.625rem',
        padding: '0.875rem 1rem',
        borderRadius: '0.75rem',
        background: style.bg,
        border: `1px solid ${style.border}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        animation: 'toastSlideIn 0.25s ease',
        backdropFilter: 'blur(12px)',
      }}
    >
      {style.icon}
      <p
        style={{
          flex: 1,
          fontSize: '0.875rem',
          color: '#f1f5f9',
          lineHeight: 1.4,
          margin: 0,
        }}
      >
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#94a3b8',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(1rem); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
