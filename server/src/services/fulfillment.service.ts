import { PrismaClient } from '@prisma/client';
import { logAudit } from './audit.service';

const prisma = new PrismaClient();

export interface WarehouseSplitRecommendation {
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

/**
 * Calculates optimal multi-warehouse inventory split for a quotation.
 */
export async function recommendFulfillment(quoteId: string): Promise<WarehouseSplitRecommendation[]> {
  const quote = await prisma.quotation.findUnique({
    where: { id: quoteId },
    include: {
      lines: { include: { product: true } },
    },
  });

  if (!quote) throw new Error('Quotation not found');

  const warehouses = await prisma.warehouse.findMany({
    include: { inventoryItems: true },
  });

  const results: WarehouseSplitRecommendation[] = [];

  for (const line of quote.lines) {
    // Only physical non-subscription items require fulfillment
    if (line.isRecurring) continue;

    const requested = line.quantity;
    let remainingNeeded = requested;

    const warehouseAvailability = warehouses.map((wh) => {
      const inv = wh.inventoryItems.find((i) => i.productId === line.productId);
      const available = inv ? Math.max(0, inv.onHandQty - inv.reservedQty) : 0;
      return {
        warehouseId: wh.id,
        warehouseName: wh.name,
        warehouseCode: wh.code,
        availableQty: available,
        allocatedQty: 0,
        shippingCost: wh.code === 'WH-MAIN' ? 25.0 : 40.0, // Shipping cost model
      };
    });

    // Step 1: Check if any single warehouse can satisfy 100% of requested quantity
    const singleWh = warehouseAvailability.find((w) => w.availableQty >= requested);
    if (singleWh) {
      singleWh.allocatedQty = requested;
      remainingNeeded = 0;
    } else {
      // Step 2: Sort warehouses by available stock descending and split
      warehouseAvailability.sort((a, b) => b.availableQty - a.availableQty);

      for (const wh of warehouseAvailability) {
        if (remainingNeeded <= 0) break;
        const take = Math.min(remainingNeeded, wh.availableQty);
        wh.allocatedQty = take;
        remainingNeeded -= take;
      }
    }

    const allocations = warehouseAvailability
      .filter((w) => w.allocatedQty > 0)
      .map((w) => ({
        warehouseId: w.warehouseId,
        warehouseName: w.warehouseName,
        warehouseCode: w.warehouseCode,
        availableQty: w.availableQty,
        allocatedQty: w.allocatedQty,
        shippingCost: w.shippingCost,
      }));

    const backorderQty = Math.max(0, remainingNeeded);

    results.push({
      lineId: line.id,
      productId: line.productId,
      productName: line.product.name,
      requestedQty: requested,
      allocations,
      backorderQty,
      isFullySatisfied: backorderQty === 0,
    });
  }

  return results;
}

/**
 * Accepts suggested warehouse split and executes inventory reservations & backorders.
 */
export async function acceptFulfillmentAllocation(quoteId: string, userId: string, userName: string, userRole: string) {
  const recommendations = await recommendFulfillment(quoteId);

  for (const rec of recommendations) {
    for (const alloc of rec.allocations) {
      // Create WarehouseAllocation
      await prisma.warehouseAllocation.create({
        data: {
          quotationId: quoteId,
          lineId: rec.lineId,
          warehouseId: alloc.warehouseId,
          allocatedQty: alloc.allocatedQty,
          shipmentCount: 1,
          shippingCost: alloc.shippingCost,
          status: 'ALLOCATED',
        },
      });

      // Update InventoryItem reservedQty
      await prisma.inventoryItem.update({
        where: {
          warehouseId_productId: {
            warehouseId: alloc.warehouseId,
            productId: rec.productId,
          },
        },
        data: {
          reservedQty: { increment: alloc.allocatedQty },
        },
      });
    }

    // Handle backorder if needed
    if (rec.backorderQty > 0) {
      await prisma.backorder.create({
        data: {
          quotationId: quoteId,
          lineId: rec.lineId,
          productId: rec.productId,
          requestedQty: rec.requestedQty,
          backorderedQty: rec.backorderQty,
          status: 'PENDING',
        },
      });
    }
  }

  // Update Quote Status
  const updatedQuote = await prisma.quotation.update({
    where: { id: quoteId },
    data: { status: 'FULFILLING' },
  });

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: userRole,
    entityType: 'QUOTATION',
    entityId: quoteId,
    action: 'ALLOCATION_CREATED',
    afterState: { status: 'FULFILLING', recommendations },
    reason: 'Fulfillment allocation accepted and inventory reserved.',
  });

  return { status: 'FULFILLING', recommendations };
}

/**
 * Manual override of warehouse allocation by FINANCE_OPERATIONS or ADMIN.
 */
export async function overrideFulfillmentAllocation({
  quoteId,
  lineId,
  warehouseId,
  allocatedQty,
  reason,
  userId,
  userName,
  userRole,
}: {
  quoteId: string;
  lineId: string;
  warehouseId: string;
  allocatedQty: number;
  reason: string;
  userId: string;
  userName: string;
  userRole: string;
}) {
  if (userRole !== 'FINANCE_OPERATIONS' && userRole !== 'ADMIN') {
    throw new Error('Forbidden: Only Finance Operations or Admin can perform manual fulfillment overrides.');
  }

  if (!reason) throw new Error('Reason is required for manual fulfillment override.');

  const line = await prisma.quotationLine.findUnique({
    where: { id: lineId },
  });
  if (!line) throw new Error('Quotation line not found');

  const inv = await prisma.inventoryItem.findUnique({
    where: { warehouseId_productId: { warehouseId, productId: line.productId } },
  });

  const available = inv ? Math.max(0, inv.onHandQty - inv.reservedQty) : 0;
  if (allocatedQty > available) {
    throw new Error(`Insufficient stock: Cannot allocate ${allocatedQty} units. Only ${available} available in warehouse.`);
  }

  // Record Allocation
  const allocation = await prisma.warehouseAllocation.create({
    data: {
      quotationId: quoteId,
      lineId,
      warehouseId,
      allocatedQty,
      shipmentCount: 1,
      shippingCost: 35.0,
      status: 'OVERRIDDEN',
    },
  });

  // Reserve stock
  await prisma.inventoryItem.update({
    where: { warehouseId_productId: { warehouseId, productId: line.productId } },
    data: { reservedQty: { increment: allocatedQty } },
  });

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: userRole,
    entityType: 'QUOTATION',
    entityId: quoteId,
    action: 'ALLOCATION_OVERRIDDEN',
    afterState: { allocationId: allocation.id, lineId, warehouseId, allocatedQty },
    reason,
  });

  return allocation;
}
