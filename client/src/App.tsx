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
import { SubscriptionsView } from './pages/SubscriptionsView';
import { InvoicesView } from './pages/InvoicesView';
import { CustomerPortal } from './pages/CustomerPortal';
import { DealHealthView } from './pages/DealHealthView';
import { ReportsView } from './pages/ReportsView';
import { AdminConfig } from './pages/AdminConfig';
import { getAuthToken } from './api';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = getAuthToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

export const App: React.FC = () => {
  return (
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
          path="/subscriptions"
          element={
            <ProtectedRoute>
              <SubscriptionsView />
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
          path="/customer-portal"
          element={
            <ProtectedRoute>
              <CustomerPortal />
            </ProtectedRoute>
          }
        />

        <Route
          path="/deal-health"
          element={
            <ProtectedRoute>
              <DealHealthView />
            </ProtectedRoute>
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
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminConfig />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
