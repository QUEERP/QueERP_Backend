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

const createStockTransfer = async (businessId, userId, userEmail, data) => {
  return await prisma.$transaction(async (tx) => {
    if (data.fromWarehouseId === data.toWarehouseId) {
      throw new Error("Source and destination warehouses must be different.");
    }

    // Generate Transfer Number
    const transferNumber = await generateDocNumber(tx, businessId, "TRSF", "stockTransfer", "transferNumber");

    const transfer = await tx.stockTransfer.create({
      data: {
        businessId,
        transferNumber,
        fromWarehouseId: data.fromWarehouseId,
        toWarehouseId: data.toWarehouseId,
        status: data.status || "PENDING",
        transferDate: data.transferDate ? new Date(data.transferDate) : new Date(),
        notes: data.notes || null,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: parseFloat(item.quantity),
            batchNumber: item.batchNumber || null,
            serialNumbers: item.serialNumbers || []
          }))
        }
      },
      include: {
        items: true,
        fromWarehouse: true,
        toWarehouse: true
      }
    });

    // If initial status is SHIPPED or COMPLETED, execute corresponding stock changes
    if (transfer.status === "SHIPPED") {
      await executeShipment(tx, businessId, transfer, userEmail);
    } else if (transfer.status === "COMPLETED") {
      await executeShipment(tx, businessId, transfer, userEmail);
      await executeCompletion(tx, businessId, transfer, userEmail);
    }

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "STOCK_TRANSFER_CREATED",
      module: "INVENTORY",
      entityType: "StockTransfer",
      entityId: transfer.id,
      details: { transferNumber, status: transfer.status }
    });

    return transfer;
  });
};

const executeShipment = async (tx, businessId, transfer, userEmail) => {
  for (const item of transfer.items) {
    // TRANSFER_OUT from source warehouse
    await createStockMovement(tx, {
      businessId,
      productId: item.productId,
      warehouseId: transfer.fromWarehouseId,
      quantity: -parseFloat(item.quantity),
      type: "TRANSFER_OUT",
      referenceType: "TRANSFER",
      referenceId: transfer.id,
      performedBy: userEmail,
      notes: `Stock shipped from source: ${transfer.transferNumber}`,
      batchNumber: item.batchNumber,
      serialNumbers: item.serialNumbers
    });
  }
};

const executeCompletion = async (tx, businessId, transfer, userEmail) => {
  for (const item of transfer.items) {
    // TRANSFER_IN to destination warehouse
    await createStockMovement(tx, {
      businessId,
      productId: item.productId,
      warehouseId: transfer.toWarehouseId,
      quantity: parseFloat(item.quantity),
      type: "TRANSFER_IN",
      referenceType: "TRANSFER",
      referenceId: transfer.id,
      performedBy: userEmail,
      notes: `Stock received at destination: ${transfer.transferNumber}`,
      batchNumber: item.batchNumber,
      serialNumbers: item.serialNumbers
    });
  }
};

const changeTransferStatus = async (businessId, userId, userEmail, transferId, newStatus) => {
  return await prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.findFirst({
      where: { id: transferId, businessId },
      include: { items: true }
    });
    if (!transfer) throw new Error("Stock transfer not found");

    if (transfer.status === newStatus) return transfer;

    // Validate state transitions
    if (transfer.status === "COMPLETED") {
      throw new Error("Cannot change status of a completed transfer.");
    }
    if (transfer.status === "CANCELLED") {
      throw new Error("Cannot change status of a cancelled transfer.");
    }

    if (newStatus === "SHIPPED") {
      if (transfer.status !== "PENDING") {
        throw new Error("Can only ship a pending transfer.");
      }
      await executeShipment(tx, businessId, transfer, userEmail);
    } else if (newStatus === "COMPLETED") {
      if (transfer.status === "PENDING") {
        // Ship first, then complete
        await executeShipment(tx, businessId, transfer, userEmail);
      }
      await executeCompletion(tx, businessId, transfer, userEmail);
    } else if (newStatus === "CANCELLED") {
      if (transfer.status === "SHIPPED") {
        // If it was shipped, we must return items to source warehouse (reversing SHIPment)
        for (const item of transfer.items) {
          await createStockMovement(tx, {
            businessId,
            productId: item.productId,
            warehouseId: transfer.fromWarehouseId,
            quantity: parseFloat(item.quantity),
            type: "TRANSFER_IN",
            referenceType: "TRANSFER",
            referenceId: transfer.id,
            performedBy: userEmail,
            notes: `Stock returned to source (Transfer Cancelled): ${transfer.transferNumber}`,
            batchNumber: item.batchNumber,
            serialNumbers: item.serialNumbers
          });
        }
      }
    }

    const updated = await tx.stockTransfer.update({
      where: { id: transferId },
      data: { status: newStatus },
      include: {
        items: true,
        fromWarehouse: true,
        toWarehouse: true
      }
    });

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "STOCK_TRANSFER_STATUS_CHANGED",
      module: "INVENTORY",
      entityType: "StockTransfer",
      entityId: transferId,
      details: { transferNumber: transfer.transferNumber, oldStatus: transfer.status, newStatus }
    });

    return updated;
  });
};

const getStockTransfers = async (businessId, query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const where = { businessId };

  if (query.status) {
    where.status = query.status;
  }
  if (query.search) {
    where.transferNumber = { contains: query.search, mode: "insensitive" };
  }

  const [transfers, total] = await Promise.all([
    prisma.stockTransfer.findMany({
      where,
      skip,
      take: limit,
      include: {
        fromWarehouse: { select: { id: true, name: true } },
        toWarehouse: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.stockTransfer.count({ where })
  ]);

  return {
    transfers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

const getStockTransferById = async (businessId, id) => {
  const transfer = await prisma.stockTransfer.findFirst({
    where: { id, businessId },
    include: {
      fromWarehouse: true,
      toWarehouse: true,
      items: {
        include: {
          product: true
        }
      }
    }
  });

  if (!transfer) throw new Error("Stock transfer not found");
  return transfer;
};

module.exports = {
  createStockTransfer,
  changeTransferStatus,
  getStockTransfers,
  getStockTransferById
};
