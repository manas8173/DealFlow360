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

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'API request failed');
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

  // Fulfillment
  getFulfillmentOrders: () => request('/fulfillment'),
  getFulfillmentRecommendation: (orderId: string) => request(`/fulfillment/${orderId}/recommend`),
  acceptFulfillmentSplit: (orderId: string) => request(`/fulfillment/${orderId}/accept`, { method: 'POST' }),
  overrideFulfillment: (orderId: string, data: any) => request(`/fulfillment/${orderId}/override`, { method: 'POST', body: JSON.stringify(data) }),

  // Subscriptions & Billing
  getSubscriptions: () => request('/subscriptions'),
  modifySubscription: (id: string, newQuantity: number) => request(`/subscriptions/${id}/modify`, { method: 'POST', body: JSON.stringify({ newQuantity }) }),
  getInvoices: () => request('/invoices'),
  getInvoice: (id: string) => request(`/invoices/${id}`),
  recordPayment: (invoiceId: string, data: any) => request(`/invoices/${invoiceId}/payment`, { method: 'POST', body: JSON.stringify(data) }),

  // Customer Portal
  getPortalQuotations: () => request('/portal/quotations'),
  getPortalQuotation: (id: string) => request(`/portal/quotations/${id}`),
  submitCounterDiscount: (quoteId: string, data: any) => request(`/portal/quotations/${quoteId}/change-requests`, { method: 'POST', body: JSON.stringify(data) }),
  acceptChangeRequest: (changeRequestId: string) => request(`/portal/change-requests/${changeRequestId}/accept`, { method: 'POST' }),
  confirmPortalQuotation: (quoteId: string) => request(`/portal/quotations/${quoteId}/confirm`, { method: 'POST' }),

  // Deal Health
  getDealHealthAlerts: () => request('/deal-health/alerts'),
  nudgeAlert: (id: string) => request(`/deal-health/alerts/${id}/nudge`, { method: 'POST' }),
  escalateAlert: (id: string) => request(`/deal-health/alerts/${id}/escalate`, { method: 'POST' }),

  // Audit Logs
  getAuditLogs: () => request('/audit'),

  // Admin
  getProducts: () => request('/admin/products'),
  getCategories: () => request('/admin/categories'),
  getTiers: () => request('/admin/tiers'),
  getWarehouses: () => request('/admin/warehouses'),
  getCustomers: () => request('/admin/customers'),
  getSignupRequests: () => request('/admin/signup-requests'),
  approveSignupRequest: (id: string) => request(`/admin/signup-requests/${id}/approve`, { method: 'POST' }),
  rejectSignupRequest: (id: string) => request(`/admin/signup-requests/${id}/reject`, { method: 'POST' }),
  resetDatabase: () => request('/admin/reset-database', { method: 'POST' }),
};
