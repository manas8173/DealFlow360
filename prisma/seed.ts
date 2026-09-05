import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const Role = {
  SALES_REP: 'SALES_REP',
  SALES_MANAGER: 'SALES_MANAGER',
  FINANCE_OPERATIONS: 'FINANCE_OPERATIONS',
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
};

export const Tier = {
  BRONZE: 'BRONZE',
  SILVER: 'SILVER',
  GOLD: 'GOLD',
};

export const QuoteStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  SENT: 'SENT',
  UNDER_NEGOTIATION: 'UNDER_NEGOTIATION',
  CONFIRMED: 'CONFIRMED',
  FULFILLING: 'FULFILLING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  REVISION_REQUIRED: 'REVISION_REQUIRED',
};

export const RiskBand = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
};

export const ApprovalStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  RETURNED: 'RETURNED',
  REJECTED: 'REJECTED',
};

export const AlertType = {
  STALLED: 'STALLED',
  DISCOUNT_ANOMALY: 'DISCOUNT_ANOMALY',
  DELIVERY_SLIPPAGE: 'DELIVERY_SLIPPAGE',
};

export const AlertSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
};

export const AlertStatus = {
  ACTIVE: 'ACTIVE',
  NUDGED: 'NUDGED',
  RESOLVED: 'RESOLVED',
  ESCALATED: 'ESCALATED',
};

async function main() {
  console.log('🌱 Starting DealFlow360 Database Seeding...');

  // Clean existing tables
  await prisma.auditLog.deleteMany();
  await prisma.dealHealthAlert.deleteMany();
  await prisma.changeRequest.deleteMany();
  await prisma.negotiationMessage.deleteMany();
  await prisma.negotiationThread.deleteMany();
  await prisma.creditNote.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.billingSchedule.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.backorder.deleteMany();
  await prisma.warehouseAllocation.deleteMany();
  await prisma.recommendationRule.deleteMany();
  await prisma.approvalStep.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.quotationLine.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.approvalPolicy.deleteMany();
  await prisma.priceListRule.deleteMany();
  await prisma.priceList.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.customerTier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.customer.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Customer Tiers
  console.log('Seeding Customer Tiers...');
  await prisma.customerTier.createMany({
    data: [
      { tier: Tier.BRONZE, maxDiscountPercent: 5.0 },
      { tier: Tier.SILVER, maxDiscountPercent: 10.0 },
      { tier: Tier.GOLD, maxDiscountPercent: 15.0 },
    ],
  });

  // 2. Product Categories
  console.log('Seeding Product Categories...');
  const catHardware = await prisma.productCategory.create({
    data: { name: 'Hardware', discountCeilingPercent: 15.0 },
  });
  const catServices = await prisma.productCategory.create({
    data: { name: 'Services', discountCeilingPercent: 10.0 },
  });
  const catSubscriptions = await prisma.productCategory.create({
    data: { name: 'Subscriptions', discountCeilingPercent: 15.0 },
  });

  // 3. Customers
  console.log('Seeding Customers...');
  const acmeCustomer = await prisma.customer.create({
    data: { name: 'Acme Corp', email: 'customer@acme.demo', company: 'Acme Corp', tier: Tier.GOLD },
  });
  const betaCustomer = await prisma.customer.create({
    data: { name: 'Beta Industries', email: 'contact@betaindustries.demo', company: 'Beta Industries', tier: Tier.SILVER },
  });
  const deltaCustomer = await prisma.customer.create({
    data: { name: 'Delta LLC', email: 'purchasing@deltallc.demo', company: 'Delta LLC', tier: Tier.BRONZE },
  });
  const novaCustomer = await prisma.customer.create({
    data: { name: 'Nova Retail', email: 'procurement@novaretail.demo', company: 'Nova Retail', tier: Tier.GOLD },
  });
  const zenithCustomer = await prisma.customer.create({
    data: { name: 'Zenith Co', email: 'buying@zenithco.demo', company: 'Zenith Co', tier: Tier.SILVER },
  });
  const orionCustomer = await prisma.customer.create({
    data: { name: 'Orion Ltd', email: 'ops@orionltd.demo', company: 'Orion Ltd', tier: Tier.GOLD },
  });

  // 4. Users
  console.log('Seeding Users...');
  const repUser = await prisma.user.create({
    data: { email: 'rep@dealflow360.demo', name: 'Alex Rep', role: Role.SALES_REP, passwordHash },
  });
  const managerUser = await prisma.user.create({
    data: { email: 'manager@dealflow360.demo', name: 'Morgan Manager', role: Role.SALES_MANAGER, passwordHash },
  });
  const financeUser = await prisma.user.create({
    data: { email: 'finance@dealflow360.demo', name: 'Frank Finance', role: Role.FINANCE_OPERATIONS, passwordHash },
  });
  const adminUser = await prisma.user.create({
    data: { email: 'admin@dealflow360.demo', name: 'Alice Admin', role: Role.ADMIN, passwordHash },
  });
  const customerUser = await prisma.user.create({
    data: { email: 'customer@acme.demo', name: 'Charlie Customer', role: Role.CUSTOMER, passwordHash, customerId: acmeCustomer.id },
  });

  // 5. Approval Policies
  console.log('Seeding Approval Policies...');
  await prisma.approvalPolicy.createMany({
    data: [
      { name: 'Low Risk Policy', riskBand: RiskBand.LOW, minScore: 0.0, maxScore: 0.0, rolesRequired: JSON.stringify([]) },
      { name: 'Medium Risk Policy', riskBand: RiskBand.MEDIUM, minScore: 0.01, maxScore: 5.0, rolesRequired: JSON.stringify([Role.SALES_MANAGER]) },
      { name: 'High Risk Policy', riskBand: RiskBand.HIGH, minScore: 5.01, maxScore: 100.0, rolesRequired: JSON.stringify([Role.SALES_MANAGER, Role.FINANCE_OPERATIONS]) },
    ],
  });

  // 6. Products
  console.log('Seeding Products...');
  const laptopProduct = await prisma.product.create({
    data: {
      sku: 'LP-14-01',
      name: 'Laptop Pro 14',
      description: 'High performance enterprise workstation laptop',
      categoryId: catHardware.id,
      basePrice: 1200.0,
      costPrice: 850.0,
      taxPercent: 15.0,
      unit: 'unit',
      isSubscriptionEligible: false,
    },
  });

  const setupProduct = await prisma.product.create({
    data: {
      sku: 'SRV-SETUP-01',
      name: 'Onsite Setup Service',
      description: 'White-glove deployment and setup service',
      categoryId: catServices.id,
      basePrice: 450.0,
      costPrice: 200.0,
      taxPercent: 10.0,
      unit: 'service',
      isSubscriptionEligible: false,
    },
  });

  const warrantyProduct = await prisma.product.create({
    data: {
      sku: 'WRT-EXT-01',
      name: 'Extended Warranty',
      description: '1-Year Extended hardware replacement warranty',
      categoryId: catHardware.id,
      basePrice: 180.0,
      costPrice: 80.0,
      taxPercent: 15.0,
      unit: 'unit',
      isSubscriptionEligible: false,
    },
  });

  const mouseProduct = await prisma.product.create({
    data: {
      sku: 'ACC-MSE-01',
      name: 'Wireless Mouse',
      description: 'Ergonomic multi-device wireless mouse',
      categoryId: catHardware.id,
      basePrice: 50.0,
      costPrice: 18.0,
      taxPercent: 15.0,
      unit: 'unit',
    },
  });

  const dockProduct = await prisma.product.create({
    data: {
      sku: 'ACC-DCK-01',
      name: 'Docking Station',
      description: 'Thunderbolt 4 Dual-4K display docking station',
      categoryId: catHardware.id,
      basePrice: 180.0,
      costPrice: 100.0,
      taxPercent: 15.0,
      unit: 'unit',
    },
  });

  const carePlan2yr = await prisma.product.create({
    data: {
      sku: 'SUB-CARE-2Y',
      name: 'Care Plan 2yr',
      description: '24/7 dedicated support and priority hardware swap',
      categoryId: catSubscriptions.id,
      basePrice: 46.0,
      costPrice: 15.0,
      taxPercent: 10.0,
      unit: 'month',
      isSubscriptionEligible: true,
    },
  });

  const supportSLA = await prisma.product.create({
    data: {
      sku: 'SUB-SLA-Q',
      name: 'Support SLA',
      description: 'Quarterly guaranteed 1-hour response SLA',
      categoryId: catSubscriptions.id,
      basePrice: 300.0,
      costPrice: 100.0,
      taxPercent: 10.0,
      unit: 'quarter',
      isSubscriptionEligible: true,
    },
  });

  const carePlan3yr = await prisma.product.create({
    data: {
      sku: 'SUB-CARE-3Y',
      name: 'Care Plan 3 years',
      description: 'Extended 3-year premium support package',
      categoryId: catSubscriptions.id,
      basePrice: 40.0,
      costPrice: 12.0,
      taxPercent: 10.0,
      unit: 'month',
      isSubscriptionEligible: true,
    },
  });

  // 7. Product Variants
  console.log('Seeding Product Variants...');
  await prisma.productVariant.createMany({
    data: [
      { productId: laptopProduct.id, attribute: 'Size', value: '13 inch', extraPrice: 0.0 },
      { productId: laptopProduct.id, attribute: 'Size', value: '14 inch', extraPrice: 0.0 },
      { productId: laptopProduct.id, attribute: 'Size', value: '16 inch', extraPrice: 250.0 },
    ],
  });

  // 8. Recommendation Rules
  console.log('Seeding Recommendation Rules...');
  await prisma.recommendationRule.createMany({
    data: [
      {
        sourceProductId: laptopProduct.id,
        targetProductId: mouseProduct.id,
        ruleType: 'UPSELL',
        marginDelta: 18.0,
        promotionDiscountPercent: 0.0,
        description: 'Ergonomic Bluetooth Companion',
      },
      {
        sourceProductId: laptopProduct.id,
        targetProductId: dockProduct.id,
        ruleType: 'CROSS_SELL',
        marginDelta: 40.0,
        promotionDiscountPercent: 12.0,
        description: 'Dual-4K Port Hub - Special 12% Promo',
      },
      {
        sourceProductId: laptopProduct.id,
        targetProductId: carePlan2yr.id,
        ruleType: 'COMPLEMENTARY',
        marginDelta: 46.0,
        promotionDiscountPercent: 0.0,
        description: 'Monthly Enterprise Peace of Mind',
      },
    ],
  });

  // 9. Warehouses & Inventory
  console.log('Seeding Warehouses and Inventory...');
  const mainWarehouse = await prisma.warehouse.create({
    data: { name: 'Main Warehouse', code: 'WH-MAIN', location: 'Chicago, IL' },
  });
  const eastDepot = await prisma.warehouse.create({
    data: { name: 'East Depot', code: 'WH-EAST', location: 'Newark, NJ' },
  });

  // Laptop Pro 14 Inventory
  await prisma.inventoryItem.create({
    data: { warehouseId: mainWarehouse.id, productId: laptopProduct.id, onHandQty: 40, reservedQty: 18 }, // Available = 22
  });
  await prisma.inventoryItem.create({
    data: { warehouseId: eastDepot.id, productId: laptopProduct.id, onHandQty: 10, reservedQty: 6 }, // Available = 4
  });

  // Dock & Mouse Inventory
  await prisma.inventoryItem.create({
    data: { warehouseId: mainWarehouse.id, productId: dockProduct.id, onHandQty: 50, reservedQty: 5 },
  });
  await prisma.inventoryItem.create({
    data: { warehouseId: mainWarehouse.id, productId: mouseProduct.id, onHandQty: 100, reservedQty: 10 },
  });

  // 10. Primary Demo Quotation Q-1042
  console.log('Seeding Primary Demo Quote Q-1042...');
  
  const q1042RiskExplanation = JSON.stringify({
    worstLine: 'Onsite Setup Service',
    givenDiscount: 18.0,
    allowedDiscount: 10.0,
    overagePoints: 8.0,
    weightedRisk: 1.19,
    worstOveragePenalty: 4.0,
    riskScore: 5.19,
    riskBand: 'HIGH',
    requiredApprovalChain: ['SALES_MANAGER', 'FINANCE_OPERATIONS'],
  });

  const quote1042 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1042',
      customerId: acmeCustomer.id,
      ownerId: repUser.id,
      status: QuoteStatus.DRAFT,
      version: 1,
      currency: 'USD',
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: 3030.0,
      totalDiscount: 369.0,
      netTotal: 2661.0,
      totalTax: 378.0,
      totalMargin: 663.0,
      totalMarginPercent: 24.9,
      riskScore: 5.19,
      riskBand: RiskBand.HIGH,
      riskExplanation: q1042RiskExplanation,
      notes: 'Primary enterprise workstation quote for Acme Corp Acme HQ expansion',
      lines: {
        create: [
          {
            productId: laptopProduct.id,
            quantity: 2,
            unitPrice: 1200.0,
            discountPercent: 12.0,
            effectiveCeiling: 15.0,
            overagePoints: 0.0,
            status: 'OK',
            netPrice: 2112.0,
            taxAmount: 316.8,
            totalAmount: 2428.8,
            costPrice: 850.0,
            marginAmount: 412.0,
            marginPercent: 19.51,
            isRecurring: false,
          },
          {
            productId: setupProduct.id,
            quantity: 1,
            unitPrice: 450.0,
            discountPercent: 18.0,
            effectiveCeiling: 10.0,
            overagePoints: 8.0,
            status: 'OVER (+8pt)',
            netPrice: 369.0,
            taxAmount: 36.9,
            totalAmount: 405.9,
            costPrice: 200.0,
            marginAmount: 169.0,
            marginPercent: 45.8,
            isRecurring: false,
          },
          {
            productId: warrantyProduct.id,
            quantity: 1,
            unitPrice: 180.0,
            discountPercent: 10.0,
            effectiveCeiling: 15.0,
            overagePoints: 0.0,
            status: 'OK',
            netPrice: 162.0,
            taxAmount: 24.3,
            totalAmount: 186.3,
            costPrice: 80.0,
            marginAmount: 82.0,
            marginPercent: 50.62,
            isRecurring: false,
          },
        ],
      },
    },
  });

  // 11. Low Risk Demo Quote Q-1001
  console.log('Seeding Low Risk Demo Quote Q-1001...');
  await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1001',
      customerId: novaCustomer.id,
      ownerId: repUser.id,
      status: QuoteStatus.APPROVED,
      version: 1,
      currency: 'USD',
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: 6000.0,
      totalDiscount: 600.0,
      netTotal: 5400.0,
      totalTax: 810.0,
      totalMargin: 1150.0,
      totalMarginPercent: 21.3,
      riskScore: 0.0,
      riskBand: RiskBand.LOW,
      riskExplanation: JSON.stringify({
        worstLine: 'Laptop Pro 14',
        givenDiscount: 10.0,
        allowedDiscount: 15.0,
        overagePoints: 0.0,
        weightedRisk: 0.0,
        worstOveragePenalty: 0.0,
        riskScore: 0.0,
        riskBand: 'LOW',
        requiredApprovalChain: [],
      }),
      lines: {
        create: [
          {
            productId: laptopProduct.id,
            quantity: 5,
            unitPrice: 1200.0,
            discountPercent: 10.0,
            effectiveCeiling: 15.0,
            overagePoints: 0.0,
            status: 'OK',
            netPrice: 5400.0,
            taxAmount: 810.0,
            totalAmount: 6210.0,
            costPrice: 850.0,
            marginAmount: 1150.0,
            marginPercent: 21.3,
          },
        ],
      },
    },
  });

  // 12. Deal Health Seed Quotes & Alerts
  console.log('Seeding Deal Health Alerts and Stalled/Anomaly Quotes...');
  
  const zenithQuote = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1033',
      customerId: zenithCustomer.id,
      ownerId: repUser.id,
      status: QuoteStatus.SENT,
      version: 1,
      currency: 'USD',
      validityDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      subtotal: 2400.0,
      totalDiscount: 120.0,
      netTotal: 2280.0,
      totalTax: 342.0,
      totalMargin: 580.0,
      totalMarginPercent: 25.4,
      updatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      lines: {
        create: [
          {
            productId: laptopProduct.id,
            quantity: 2,
            unitPrice: 1200.0,
            discountPercent: 5.0,
            effectiveCeiling: 10.0,
            overagePoints: 0.0,
            status: 'OK',
            netPrice: 2280.0,
            taxAmount: 342.0,
            totalAmount: 2622.0,
            costPrice: 850.0,
            marginAmount: 580.0,
            marginPercent: 25.4,
          },
        ],
      },
    },
  });

  await prisma.dealHealthAlert.create({
    data: {
      quotationId: zenithQuote.id,
      alertType: AlertType.STALLED,
      severity: AlertSeverity.HIGH,
      message: 'Quote Q-1033 with Zenith Co has been idle for 9 days with no customer response.',
      detailsJson: JSON.stringify({ idleDays: 9, thresholdDays: 7, customerName: 'Zenith Co' }),
      status: AlertStatus.ACTIVE,
    },
  });

  const deltaQuote = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1028',
      customerId: deltaCustomer.id,
      ownerId: repUser.id,
      status: QuoteStatus.UNDER_NEGOTIATION,
      version: 1,
      currency: 'USD',
      validityDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      subtotal: 3600.0,
      totalDiscount: 792.0,
      netTotal: 2808.0,
      totalTax: 421.2,
      totalMargin: 258.0,
      totalMarginPercent: 9.19,
      lines: {
        create: [
          {
            productId: laptopProduct.id,
            quantity: 3,
            unitPrice: 1200.0,
            discountPercent: 22.0,
            effectiveCeiling: 5.0,
            overagePoints: 17.0,
            status: 'OVER (+17pt)',
            netPrice: 2808.0,
            taxAmount: 421.2,
            totalAmount: 3229.2,
            costPrice: 850.0,
            marginAmount: 258.0,
            marginPercent: 9.19,
          },
        ],
      },
    },
  });

  await prisma.dealHealthAlert.create({
    data: {
      quotationId: deltaQuote.id,
      alertType: AlertType.DISCOUNT_ANOMALY,
      severity: AlertSeverity.HIGH,
      message: 'Discount anomaly detected on Q-1028: 22.0% discount is 2.75x rep historical average (8.0%).',
      detailsJson: JSON.stringify({ currentDiscount: 22.0, repAverageDiscount: 8.0, ratio: 2.75, thresholdRatio: 1.5 }),
      status: AlertStatus.ACTIVE,
    },
  });

  const betaQuote = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1019',
      customerId: betaCustomer.id,
      ownerId: repUser.id,
      status: QuoteStatus.CONFIRMED,
      version: 1,
      currency: 'USD',
      validityDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      subtotal: 36000.0,
      totalDiscount: 3600.0,
      netTotal: 32400.0,
      totalTax: 4860.0,
      totalMargin: 6900.0,
      totalMarginPercent: 21.3,
      lines: {
        create: [
          {
            productId: laptopProduct.id,
            quantity: 30,
            unitPrice: 1200.0,
            discountPercent: 10.0,
            effectiveCeiling: 10.0,
            overagePoints: 0.0,
            status: 'OK',
            netPrice: 32400.0,
            taxAmount: 4860.0,
            totalAmount: 37260.0,
            costPrice: 850.0,
            marginAmount: 6900.0,
            marginPercent: 21.3,
          },
        ],
      },
    },
  });

  await prisma.dealHealthAlert.create({
    data: {
      quotationId: betaQuote.id,
      alertType: AlertType.DELIVERY_SLIPPAGE,
      severity: AlertSeverity.MEDIUM,
      message: 'Promised delivery date for Q-1019 is at risk: requested 30 units exceeds available warehouse stock (26 units available).',
      detailsJson: JSON.stringify({ requestedQty: 30, totalAvailable: 26, deficit: 4 }),
      status: AlertStatus.ACTIVE,
    },
  });

  // 13. Audit Log Initial Record
  console.log('Seeding Initial Audit Logs...');
  await prisma.auditLog.create({
    data: {
      actorId: adminUser.id,
      actorName: adminUser.name,
      actorRole: Role.ADMIN,
      entityType: 'SYSTEM',
      entityId: 'INIT',
      action: 'SYSTEM_BOOTSTRAP_SEEDED',
      afterState: JSON.stringify({ message: 'DealFlow360 database populated with hackathon seed data' }),
      reason: 'Database re-seed',
    },
  });

  console.log('✅ DealFlow360 Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error Seeding Database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
