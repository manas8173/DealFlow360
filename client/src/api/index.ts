const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('dealflow_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('dealflow_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('dealflow_token');
  localStorage.removeItem('dealflow_user');
}

export function getStoredUser() {
  const data = localStorage.getItem('dealflow_user');
  return data ? JSON.parse(data) : null;
}

export function setStoredUser(user: any) {
  localStorage.setItem('dealflow_user', JSON.stringify(user));
}

async function request(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data: any = null;
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: { message: text } };
    }
  }

  if (!res.ok) {
    const errorMsg =
      data?.error?.message ||
      data?.message ||
      (res.status === 502 || res.status === 504
        ? 'Backend API server unreachable on port 5000. Please verify backend is running.'
        : res.status === 401
        ? 'Authentication required or session expired. Please sign in.'
        : res.status === 403
        ? 'Access forbidden for this operation.'
        : `Request failed with status ${res.status}`);
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  registerEmployee: (data: any) => request('/auth/register/employee', { method: 'POST', body: JSON.stringify(data) }),
  registerCustomer: (data: any) => request('/auth/register/customer', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),

  // Quotations
  getQuotations: (params?: { status?: string; customerId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/quotations${query ? `?${query}` : ''}`);
  },
  getQuotation: (id: string) => request(`/quotations/${id}`),
  createQuotation: (data: any) => request('/quotations', { method: 'POST', body: JSON.stringify(data) }),
  addLineItem: (quoteId: string, data: any) => request(`/quotations/${quoteId}/lines`, { method: 'POST', body: JSON.stringify(data) }),
  updateLineItem: (quoteId: string, lineId: string, data: any) => request(`/quotations/${quoteId}/lines/${lineId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteLineItem: (quoteId: string, lineId: string) => request(`/quotations/${quoteId}/lines/${lineId}`, { method: 'DELETE' }),
  recalculateQuotation: (quoteId: string) => request(`/quotations/${quoteId}/recalculate`, { method: 'POST' }),
  submitQuotation: (quoteId: string) => request(`/quotations/${quoteId}/submit`, { method: 'POST' }),
  sendQuotation: (quoteId: string) => request(`/quotations/${quoteId}/send`, { method: 'POST' }),

  // Approvals
  getApprovals: () => request('/approvals'),
  getApprovalDetail: (id: string) => request(`/approvals/${id}`),
  approveStep: (id: string, comment?: string) => request(`/approvals/${id}/approve`, { method: 'POST', body: JSON.stringify({ comment }) }),
  returnStep: (id: string, comment: string) => request(`/approvals/${id}/return`, { method: 'POST', body: JSON.stringify({ comment }) }),
  rejectStep: (id: string, comment: string) => request(`/approvals/${id}/reject`, { method: 'POST', body: JSON.stringify({ comment }) }),

  // Recommendations
  getRecommendations: (quoteId: string) => request(`/quotations/${quoteId}/recommendations`),
  addRecommendation: (quoteId: string, productId: string, promotionDiscountPercent?: number) =>
    request(`/quotations/${quoteId}/recommendations/${productId}/add`, { method: 'POST', body: JSON.stringify({ promotionDiscountPercent }) }),

  // Fulfillment & Warehouse Inventory
  getFulfillmentOrders: () => request('/fulfillment'),
  getInventoryStock: () => request('/fulfillment/inventory'),
  getFulfillmentRecommendation: (orderId: string) => request(`/fulfillment/${orderId}/recommend`),
  acceptFulfillmentSplit: (orderId: string) => request(`/fulfillment/${orderId}/accept`, { method: 'POST' }),
  overrideFulfillment: (orderId: string, data: any) => request(`/fulfillment/${orderId}/override`, { method: 'POST', body: JSON.stringify(data) }),

  // Invoices & Billing
  getInvoices: () => request('/invoices'),
  getInvoice: (id: string) => request(`/invoices/${id}`),
  recordPayment: (invoiceId: string, data: any) => request(`/invoices/${invoiceId}/payment`, { method: 'POST', body: JSON.stringify(data) }),

  // Customer Portal
  getPortalQuotations: () => request('/portal/quotations'),
  getPortalQuotation: (id: string) => request(`/portal/quotations/${id}`),
  submitCounterDiscount: (quoteId: string, data: any) => request(`/portal/quotations/${quoteId}/change-requests`, { method: 'POST', body: JSON.stringify(data) }),
  acceptChangeRequest: (changeRequestId: string) => request(`/portal/change-requests/${changeRequestId}/accept`, { method: 'POST' }),
  confirmPortalQuotation: (quoteId: string) => request(`/portal/quotations/${quoteId}/confirm`, { method: 'POST' }),
  getSalesReps: () => request('/portal/sales-reps'),
  getPortalProducts: () => request('/portal/products'),
  getCustomerQuoteRequests: () => request('/portal/quote-requests'),
  submitQuoteRequest: (data: { salesRepId: string; productId?: string; quantity?: number; notes?: string }) =>
    request('/portal/quote-requests', { method: 'POST', body: JSON.stringify(data) }),

  // Quote Requests (Sales Rep)
  getQuoteRequests: () => request('/quote-requests'),
  acceptQuoteRequest: (id: string) => request(`/quote-requests/${id}/accept`, { method: 'POST' }),
  rejectQuoteRequest: (id: string) => request(`/quote-requests/${id}/reject`, { method: 'POST' }),

  // Deal Health
  getDealHealthAlerts: () => request('/deal-health/alerts'),
  nudgeAlert: (id: string) => request(`/deal-health/alerts/${id}/nudge`, { method: 'POST' }),
  escalateAlert: (id: string) => request(`/deal-health/alerts/${id}/escalate`, { method: 'POST' }),
  resolveAlert: (id: string) => request(`/deal-health/alerts/${id}/resolve`, { method: 'POST' }),
  dismissAlert: (id: string) => request(`/deal-health/alerts/${id}`, { method: 'DELETE' }),
  clearAllAlerts: () => request('/deal-health/alerts/clear-all', { method: 'POST' }),

  // Audit Logs
  getAuditLogs: () => request('/audit'),

  // Admin
  getProducts: () => request('/admin/products'),
  getCategories: () => request('/admin/categories'),
  getCustomers: () => request('/admin/customers'),
  getWarehouses: () => request('/admin/warehouses'),
  resetDatabase: () => request('/admin/reset-database', { method: 'POST' }),
  getTiers: () => request('/admin/tiers'),
  getSignupRequests: () => request('/admin/signup-requests'),
  approveSignupRequest: (id: string) => request(`/admin/signup-requests/${id}/approve`, { method: 'POST' }),
  rejectSignupRequest: (id: string) => request(`/admin/signup-requests/${id}/reject`, { method: 'POST' }),
  updateCustomer: (id: string, data: any) => request(`/admin/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Admin Setup
  createProduct: (data: any) => request('/admin/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) => request(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  createCategory: (data: any) => request('/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: any) => request(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateTier: (tier: string, data: any) => request(`/admin/tiers/${tier}`, { method: 'PATCH', body: JSON.stringify(data) }),
  createWarehouse: (data: any) => request('/admin/warehouses', { method: 'POST', body: JSON.stringify(data) }),
  updateWarehouse: (id: string, data: any) => request(`/admin/warehouses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  upsertInventory: (warehouseId: string, data: any) => request(`/admin/warehouses/${warehouseId}/inventory`, { method: 'POST', body: JSON.stringify(data) }),
  getPriceLists: () => request('/admin/price-lists'),
  createPriceList: (data: any) => request('/admin/price-lists', { method: 'POST', body: JSON.stringify(data) }),
  addPriceListRule: (priceListId: string, data: any) => request(`/admin/price-lists/${priceListId}/rules`, { method: 'POST', body: JSON.stringify(data) }),

  // Discount Governance (Manager/Admin)
  getDiscountPolicy: () => request('/discount-policy'),
  updateTierLimit: (tier: string, maxDiscountPercent: number) =>
    request(`/discount-policy/tiers/${tier}`, { method: 'PATCH', body: JSON.stringify({ maxDiscountPercent }) }),
  updateApprovalPolicy: (riskBand: string, data: any) =>
    request(`/discount-policy/approval-policy/${riskBand}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
