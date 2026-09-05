import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { CustomerLogin } from './pages/CustomerLogin';
import { Dashboard } from './pages/Dashboard';
import { QuotationsList } from './pages/QuotationsList';
import { QuotationBuilder } from './pages/QuotationBuilder';
import { ApprovalsList } from './pages/ApprovalsList';
import { FulfillmentCenter } from './pages/FulfillmentCenter';
import { InvoicesView } from './pages/InvoicesView';
import { CustomerPortal } from './pages/CustomerPortal';
import { DealHealthView } from './pages/DealHealthView';
import { ReportsView } from './pages/ReportsView';
import { AdminSetup } from './pages/AdminSetup';
import { DiscountGovernance } from './pages/DiscountGovernance';
import { QuoteRequestsList } from './pages/QuoteRequestsList';
import { WarehouseStock } from './pages/WarehouseStock';
import { ToastProvider } from './components/Toast';
import { getAuthToken, getStoredUser } from './api';
import { Role } from './lib/roles';

const roleHomePath = (): string => {
  const role = getStoredUser()?.role;
  if (role === Role.CUSTOMER) return '/customer-portal';
  if (role === Role.SALES_MANAGER || role === Role.FINANCE_OPERATIONS) return '/approvals';
  return '/dashboard';
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = getAuthToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

// FIX: RoleRoute no longer wraps <Layout> around unauthorized redirects —
// it only renders Layout when the user is authorized.
const RoleRoute: React.FC<{ roles: string[]; children: React.ReactNode }> = ({ roles, children }) => {
  const token = getAuthToken();
  const role = getStoredUser()?.role;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(role)) {
    return <Navigate to={roleHomePath()} replace />;
  }

  return <Layout>{children}</Layout>;
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/customer-login" element={<CustomerLogin />} />

          <Route path="/signup" element={<Signup />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/quote-requests"
            element={
              <RoleRoute roles={[Role.SALES_REP, Role.SALES_MANAGER, Role.ADMIN]}>
                <QuoteRequestsList />
              </RoleRoute>
            }
          />

          <Route
            path="/quotations"
            element={
              <ProtectedRoute>
                <QuotationsList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/quotations/:id"
            element={
              <ProtectedRoute>
                <QuotationBuilder />
              </ProtectedRoute>
            }
          />

          <Route
            path="/approvals"
            element={
              <ProtectedRoute>
                <ApprovalsList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/fulfillment"
            element={
              <ProtectedRoute>
                <FulfillmentCenter />
              </ProtectedRoute>
            }
          />

          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <InvoicesView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <RoleRoute roles={[Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE_OPERATIONS, Role.ADMIN]}>
                <WarehouseStock />
              </RoleRoute>
            }
          />

          <Route
            path="/customer-portal"
            element={
              <RoleRoute roles={[Role.CUSTOMER]}>
                <CustomerPortal />
              </RoleRoute>
            }
          />

          <Route
            path="/deal-health"
            element={
              <RoleRoute roles={[Role.SALES_MANAGER, Role.ADMIN]}>
                <DealHealthView />
              </RoleRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/discount-governance"
            element={
              <RoleRoute roles={[Role.SALES_MANAGER, Role.ADMIN]}>
                <DiscountGovernance />
              </RoleRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <RoleRoute roles={[Role.ADMIN]}>
                <AdminSetup />
              </RoleRoute>
            }
          />

          <Route path="*" element={<Navigate to={roleHomePath()} replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};