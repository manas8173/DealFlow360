// ─── Core Domain Types ────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  categoryId: string;
  category?: ProductCategory;
  basePrice: number;
  unit: string;
  taxPercent: number;
  costPrice: number;
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  discountCeilingPercent: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  attribute: string;
  value: string;
  extraPrice: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  company?: string | null;
  customerId?: string | null;
  customer?: Customer | null;
}

// ─── Quotation ────────────────────────────────────────────────────────────────

export interface QuotationLine {
  id: string;
  quotationId: string;
  productId: string;
  product: Product;
  variantId?: string | null;
  variant?: ProductVariant | null;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  effectiveCeiling: number;
  overagePoints: number;
  status: string;
  netPrice: number;
  taxAmount: number;
  totalAmount: number;
  costPrice: number;
  marginAmount: number;
  marginPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalStep {
  id: string;
  approvalRequestId: string;
  stepOrder: number;
  roleRequired: string;
  status: 'PENDING' | 'APPROVED' | 'RETURNED' | 'REJECTED';
  approverId?: string | null;
  approver?: User | null;
  comment?: string | null;
  actionDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRequest {
  id: string;
  quotationId: string;
  quoteVersion: number;
  status: 'PENDING' | 'APPROVED' | 'RETURNED' | 'REJECTED' | 'SUPERSEDED';
  currentStepIndex: number;
  steps: ApprovalStep[];
  createdAt: string;
  updatedAt: string;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  customerId: string;
  customer: Customer;
  ownerId: string;
  owner: Pick<User, 'id' | 'name' | 'email'>;
  status: string;
  version: number;
  currency: string;
  validityDate: string;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  netTotal: number;
  totalMargin: number;
  totalMarginPercent: number;
  riskScore: number;
  riskBand: 'LOW' | 'MEDIUM' | 'HIGH';
  riskExplanation: string;
  notes?: string | null;
  lines: QuotationLine[];
  approvalRequests?: ApprovalRequest[];
  createdAt: string;
  updatedAt: string;
}

// ─── Fulfillment ──────────────────────────────────────────────────────────────

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string;
}

export interface WarehouseAllocation {
  id: string;
  quotationId: string;
  lineId: string;
  warehouseId: string;
  warehouse: Warehouse;
  allocatedQty: number;
  shipmentCount: number;
  shippingCost: number;
  status: string;
  createdAt: string;
}

export interface FulfillmentRecommendation {
  lineId: string;
  productId: string;
  productName: string;
  requestedQty: number;
  allocations: {
    warehouseId: string;
    warehouseName: string;
    warehouseCode: string;
    availableQty: number;
    allocatedQty: number;
    shippingCost: number;
  }[];
  backorderQty: number;
  isFullySatisfied: boolean;
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  paymentDate: string;
  notes?: string | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  quotationId?: string | null;
  customerId: string;
  customer: Customer;
  type: 'ONE_TIME' | 'RECURRING';
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  lines: InvoiceLine[];
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
}

// ─── Deal Health ──────────────────────────────────────────────────────────────

export interface DealHealthAlert {
  id: string;
  quotationId: string;
  quotation: Quotation;
  alertType: 'STALLED' | 'DISCOUNT_ANOMALY' | 'DELIVERY_SLIPPAGE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  detailsJson: string;
  status: 'ACTIVE' | 'NUDGED' | 'RESOLVED' | 'ESCALATED';
  createdAt: string;
  updatedAt: string;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeState?: string | null;
  afterState?: string | null;
  reason?: string | null;
  timestamp: string;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface CustomerTier {
  id: string;
  tier: string;
  maxDiscountPercent: number;
}

export interface ApprovalPolicy {
  id: string;
  name: string;
  riskBand: string;
  rolesRequired: string;
  minScore: number;
  maxScore: number;
}
