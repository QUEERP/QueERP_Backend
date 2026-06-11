const prisma = require("../../config/prisma");
const { logAction } = require("../sales/audit.service");
const { createStockMovement } = require("./movement.service");
const { generateDocNumber } = require("../sales/quotation.service");

const getPagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const createStockAdjustment = async (businessId, userId, userEmail, data) => {
  return await prisma.$transaction(async (tx) => {
    // Generate Adjustment Number
    const adjustmentNumber = await generateDocNumber(tx, businessId, "ADJ", "stockAdjustment", "adjustmentNumber");

    const adjustment = await tx.stockAdjustment.create({
      data: {
        businessId,
        adjustmentNumber,
        warehouseId: data.warehouseId,
        reason: data.reason || null,
        adjustmentDate: data.adjustmentDate ? new Date(data.adjustmentDate) : new Date(),
        notes: data.notes || null,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: parseFloat(item.quantity),
            type: item.type, // ADD or SUBTRACT
            batchNumber: item.batchNumber || null,
            serialNumbers: item.serialNumbers || []
          }))
        }
      },
      include: {
        items: true,
        warehouse: true
      }
    });

    // Execute stock movements for each item
    for (const item of data.items) {
      const quantityVal = item.type === "ADD" ? parseFloat(item.quantity) : -parseFloat(item.quantity);
      const movementType = item.type === "ADD" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";

      await createStockMovement(tx, {
        businessId,
        productId: item.productId,
        warehouseId: data.warehouseId,
        quantity: quantityVal,
        type: movementType,
        referenceType: "ADJUSTMENT",
        referenceId: adjustment.id,
        performedBy: userEmail,
        notes: `Stock adjustment: ${adjustmentNumber}. Reason: ${data.reason || 'None'}`,
        batchNumber: item.batchNumber || null,
        serialNumbers: item.serialNumbers || []
      });
    }

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "STOCK_ADJUSTMENT_CREATED",
      module: "INVENTORY",
      entityType: "StockAdjustment",
      entityId: adjustment.id,
      details: { adjustmentNumber, reason: data.reason }
    });

    return adjustment;
  });
};

const getStockAdjustments = async (businessId, query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const where = { businessId };

  if (query.warehouseId) {
    where.warehouseId = query.warehouseId;
  }
  if (query.search) {
    where.adjustmentNumber = { contains: query.search, mode: "insensitive" };
  }

  const [adjustments, total] = await Promise.all([
    prisma.stockAdjustment.findMany({
      where,
      skip,
      take: limit,
      include: {
        warehouse: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.stockAdjustment.count({ where })
  ]);

  return {
    adjustments,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

const getStockAdjustmentById = async (businessId, id) => {
  const adjustment = await prisma.stockAdjustment.findFirst({
    where: { id, businessId },
    include: {
      warehouse: true,
      items: {
        include: {
          product: true
        }
      }
    }
  });

  if (!adjustment) throw new Error("Stock adjustment not found");
  return adjustment;
};

module.exports = {
  createStockAdjustment,
  getStockAdjustments,
  getStockAdjustmentById
};
