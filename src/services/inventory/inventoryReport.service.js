const prisma = require("../../config/prisma");

/**
 * Stock Valuation Report
 * Returns total inventory value (qty × costPrice) per product per warehouse
 */
const getStockValuation = async (businessId, query = {}) => {
  const where = { product: { businessId } };
  if (query.warehouseId) where.warehouseId = query.warehouseId;
  if (query.productId) where.productId = query.productId;

  const stockRecords = await prisma.stock.findMany({
    where,
    include: {
      product: {
        select: { id: true, name: true, sku: true, costPrice: true, price: true }
      },
      warehouse: {
        select: { id: true, name: true }
      }
    }
  });

  let totalCostValue = 0;
  let totalSaleValue = 0;

  const rows = stockRecords.map(s => {
    const costValue = Number(s.quantity) * Number(s.product.costPrice);
    const saleValue = Number(s.quantity) * Number(s.product.price);
    totalCostValue += costValue;
    totalSaleValue += saleValue;

    return {
      productId: s.productId,
      productName: s.product.name,
      sku: s.product.sku,
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse.name,
      quantity: s.quantity,
      reservedQty: s.reservedQty,
      availableQty: s.quantity - s.reservedQty,
      costPrice: s.product.costPrice,
      salePrice: s.product.price,
      costValue,
      saleValue
    };
  });

  return { rows, totalCostValue, totalSaleValue, potentialProfit: totalSaleValue - totalCostValue };
};

/**
 * Low Stock / Reorder Alert Report
 * Returns products where available stock ≤ reorderLevel
 */
const getLowStockAlerts = async (businessId, query = {}) => {
  const products = await prisma.product.findMany({
    where: { businessId, isActive: true, type: "GOODS" },
    include: {
      stock: {
        include: { warehouse: { select: { id: true, name: true } } }
      }
    }
  });

  const alerts = [];

  for (const product of products) {
    for (const s of product.stock) {
      const available = s.quantity - s.reservedQty;
      const reorderLevel = Number(product.reorderLevel) || 0;
      const minimumStock = Number(product.minimumStock) || 0;

      if (available <= reorderLevel) {
        alerts.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          warehouseId: s.warehouseId,
          warehouseName: s.warehouse.name,
          currentStock: s.quantity,
          reservedQty: s.reservedQty,
          availableQty: available,
          reorderLevel,
          minimumStock,
          incomingQty: s.incomingQty,
          severity: available <= minimumStock ? "CRITICAL" : "WARNING"
        });
      }
    }
  }

  // Sort by severity (CRITICAL first)
  alerts.sort((a, b) => (a.severity === "CRITICAL" ? -1 : 1));
  return alerts;
};

/**
 * Stock Movement Summary Report
 * Returns aggregated movement totals by type within a date range
 */
const getMovementSummary = async (businessId, query = {}) => {
  const where = { businessId };

  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) where.createdAt.gte = new Date(query.startDate);
    if (query.endDate) where.createdAt.lte = new Date(query.endDate);
  }
  if (query.productId) where.productId = query.productId;
  if (query.warehouseId) where.warehouseId = query.warehouseId;
  if (query.type) where.type = query.type;

  const movements = await prisma.stockMovement.groupBy({
    by: ["type"],
    where,
    _sum: { quantity: true },
    _count: { id: true }
  });

  return movements.map(m => ({
    type: m.type,
    totalQuantity: m._sum.quantity,
    transactionCount: m._count.id
  }));
};

/**
 * Stock Movement Detail Report (paginated ledger)
 */
const getMovementDetail = async (businessId, query = {}) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  const where = { businessId };
  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) where.createdAt.gte = new Date(query.startDate);
    if (query.endDate) where.createdAt.lte = new Date(query.endDate);
  }
  if (query.productId) where.productId = query.productId;
  if (query.warehouseId) where.warehouseId = query.warehouseId;
  if (query.type) where.type = query.type;

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        warehouse: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.stockMovement.count({ where })
  ]);

  return { movements, total, page, limit, totalPages: Math.ceil(total / limit) };
};

/**
 * Expiring Batches Report
 */
const getExpiringBatches = async (businessId, query = {}) => {
  const daysAhead = parseInt(query.daysAhead) || 30;
  const expiryThreshold = new Date();
  expiryThreshold.setDate(expiryThreshold.getDate() + daysAhead);

  const batches = await prisma.batch.findMany({
    where: {
      businessId,
      expiryDate: {
        lte: expiryThreshold,
        gte: new Date()
      }
    },
    include: {
      product: { select: { id: true, name: true, sku: true } }
    },
    orderBy: { expiryDate: "asc" }
  });

  return batches.map(b => ({
    batchId: b.id,
    batchNumber: b.batchNumber,
    productId: b.productId,
    productName: b.product.name,
    sku: b.product.sku,
    expiryDate: b.expiryDate,
    daysUntilExpiry: Math.ceil((b.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
  }));
};

module.exports = {
  getStockValuation,
  getLowStockAlerts,
  getMovementSummary,
  getMovementDetail,
  getExpiringBatches
};
