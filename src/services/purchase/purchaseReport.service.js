const prisma = require("../../config/prisma");

/**
 * Purchase Summary Report
 * Totals by status within a date range
 */
const getPurchaseSummary = async (businessId, query = {}) => {
  const where = { businessId };
  if (query.startDate || query.endDate) {
    where.orderDate = {};
    if (query.startDate) where.orderDate.gte = new Date(query.startDate);
    if (query.endDate) where.orderDate.lte = new Date(query.endDate);
  }
  if (query.vendorId) where.vendorId = query.vendorId;

  const orders = await prisma.purchaseOrder.groupBy({
    by: ["status"],
    where,
    _sum: { totalAmount: true, tax: true, discount: true },
    _count: { id: true }
  });

  return orders.map(o => ({
    status: o.status,
    count: o._count.id,
    totalAmount: o._sum.totalAmount,
    totalTax: o._sum.tax,
    totalDiscount: o._sum.discount
  }));
};

/**
 * Purchase by Vendor Report
 * Aggregated spend per vendor
 */
const getPurchaseByVendor = async (businessId, query = {}) => {
  const where = { businessId };
  if (query.startDate || query.endDate) {
    where.orderDate = {};
    if (query.startDate) where.orderDate.gte = new Date(query.startDate);
    if (query.endDate) where.orderDate.lte = new Date(query.endDate);
  }

  const orders = await prisma.purchaseOrder.groupBy({
    by: ["vendorId"],
    where,
    _sum: { totalAmount: true },
    _count: { id: true }
  });

  // Enrich with vendor names
  const vendorIds = orders.map(o => o.vendorId);
  const vendors = await prisma.vendor.findMany({
    where: { id: { in: vendorIds } },
    select: { id: true, name: true, companyName: true }
  });
  const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));

  return orders
    .map(o => ({
      vendorId: o.vendorId,
      vendorName: vendorMap[o.vendorId]?.name || "Unknown",
      companyName: vendorMap[o.vendorId]?.companyName || null,
      orderCount: o._count.id,
      totalAmount: o._sum.totalAmount
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
};

/**
 * Vendor Bills Aging Report
 * Groups outstanding bills by overdue bracket (0-30, 31-60, 61-90, 90+)
 */
const getBillsAging = async (businessId) => {
  const today = new Date();

  const bills = await prisma.bill.findMany({
    where: {
      businessId,
      status: { in: ["UNPAID", "PARTIALLY_PAID"] }
    },
    include: {
      vendor: { select: { id: true, name: true, companyName: true } }
    }
  });

  const brackets = {
    current: [],
    "1_30": [],
    "31_60": [],
    "61_90": [],
    "over_90": []
  };

  for (const bill of bills) {
    if (!bill.dueDate) {
      brackets.current.push(bill);
      continue;
    }
    const overdueDays = Math.floor((today - new Date(bill.dueDate)) / (1000 * 60 * 60 * 24));
    if (overdueDays <= 0) brackets.current.push(bill);
    else if (overdueDays <= 30) brackets["1_30"].push(bill);
    else if (overdueDays <= 60) brackets["31_60"].push(bill);
    else if (overdueDays <= 90) brackets["61_90"].push(bill);
    else brackets.over_90.push(bill);
  }

  const summarize = (list) => ({
    count: list.length,
    totalOutstanding: list.reduce((sum, b) => sum + Number(b.outstandingAmount), 0),
    bills: list.map(b => ({
      id: b.id,
      billNumber: b.billNumber,
      vendorName: b.vendor.name,
      totalAmount: b.totalAmount,
      outstandingAmount: b.outstandingAmount,
      dueDate: b.dueDate,
      status: b.status
    }))
  });

  return {
    current: summarize(brackets.current),
    overdue_1_30: summarize(brackets["1_30"]),
    overdue_31_60: summarize(brackets["31_60"]),
    overdue_61_90: summarize(brackets["61_90"]),
    overdue_90_plus: summarize(brackets.over_90),
    grandTotalOutstanding: bills.reduce((sum, b) => sum + Number(b.outstandingAmount), 0)
  };
};

/**
 * GRN Summary Report
 * Shows receiving activity by vendor and PO
 */
const getGRNSummary = async (businessId, query = {}) => {
  const where = { businessId };
  if (query.startDate || query.endDate) {
    where.receivedDate = {};
    if (query.startDate) where.receivedDate.gte = new Date(query.startDate);
    if (query.endDate) where.receivedDate.lte = new Date(query.endDate);
  }
  if (query.vendorId) where.vendorId = query.vendorId;

  const grns = await prisma.goodsReceiveNote.findMany({
    where,
    include: {
      vendor: { select: { id: true, name: true, companyName: true } },
      purchaseOrder: { select: { id: true, poNumber: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true } }
        }
      }
    },
    orderBy: { receivedDate: "desc" }
  });

  return grns.map(g => ({
    id: g.id,
    grnNumber: g.grnNumber,
    vendorName: g.vendor.name,
    poNumber: g.purchaseOrder?.poNumber || null,
    receivedDate: g.receivedDate,
    itemCount: g.items.length,
    totalReceived: g.items.reduce((sum, i) => sum + i.quantityReceived, 0),
    totalDamaged: g.items.reduce((sum, i) => sum + i.quantityDamaged, 0)
  }));
};

/**
 * Purchase Returns Summary
 */
const getPurchaseReturnsSummary = async (businessId, query = {}) => {
  const where = { businessId };
  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) where.createdAt.gte = new Date(query.startDate);
    if (query.endDate) where.createdAt.lte = new Date(query.endDate);
  }
  if (query.vendorId) where.vendorId = query.vendorId;

  const returns = await prisma.purchaseReturn.groupBy({
    by: ["status", "refundStatus"],
    where,
    _sum: { totalAmount: true },
    _count: { id: true }
  });

  return returns.map(r => ({
    status: r.status,
    refundStatus: r.refundStatus,
    count: r._count.id,
    totalAmount: r._sum.totalAmount
  }));
};

module.exports = {
  getPurchaseSummary,
  getPurchaseByVendor,
  getBillsAging,
  getGRNSummary,
  getPurchaseReturnsSummary
};
