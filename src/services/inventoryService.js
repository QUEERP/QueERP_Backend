const prisma = require("../config/prisma");

class InventoryService {
  /**
   * Safe Stock Increase (e.g. GRN / Purchase In / Return / Opening Adjustment)
   */
  static async increaseStock(params) {
    const client = params.tx || prisma;
    const { businessId, productId, warehouseId, quantity, type, reference = {}, performedBy, note } = params;

    if (quantity <= 0) {
      throw new Error("Quantity to increase must be positive.");
    }

    // 1. Update or create the Stock entry
    const stock = await client.stock.upsert({
      where: {
        productId_warehouseId: { productId, warehouseId }
      },
      update: {
        quantity: { increment: Number(quantity) }
      },
      create: {
        productId,
        warehouseId,
        quantity: Number(quantity),
        reservedQty: 0
      }
    });

    // 2. Log the exact movement for audit trails
    return await client.stockMovement.create({
      data: {
        businessId,
        productId,
        warehouseId,
        type,
        quantity: Number(quantity),
        balanceAfter: stock.quantity,
        purchaseOrderId: reference.purchaseOrderId || null,
        billId: reference.billId || null,
        grnId: reference.grnId || null,
        referenceNo: reference.referenceNo || null,
        performedBy: String(performedBy),
        notes: note || null
      }
    });
  }

  /**
   * Safe Stock Outflow (e.g. Delivery / Invoice shipment / Adjustments)
   */
  static async decreaseStock(params) {
    const client = params.tx || prisma;
    const { businessId, productId, warehouseId, quantity, type, reference = {}, performedBy, note } = params;

    if (quantity <= 0) {
      throw new Error("Quantity to decrease must be positive.");
    }

    // Lock and retrieve stock record for safety
    const currentStock = await client.stock.findUnique({
      where: {
        productId_warehouseId: { productId, warehouseId }
      }
    });

    if (!currentStock || currentStock.quantity < quantity) {
      throw new Error(`Insufficient stock in warehouse for Product ID: ${productId}. Available: ${currentStock?.quantity || 0}, Requested: ${quantity}`);
    }

    const updatedStock = await client.stock.update({
      where: {
        productId_warehouseId: { productId, warehouseId }
      },
      data: {
        quantity: { decrement: Number(quantity) }
      }
    });

    return await client.stockMovement.create({
      data: {
        businessId,
        productId,
        warehouseId,
        type,
        quantity: -Number(quantity), // Outflow is a negative delta
        balanceAfter: updatedStock.quantity,
        salesOrderId: reference.salesOrderId || null,
        invoiceId: reference.invoiceId || null,
        referenceNo: reference.referenceNo || null,
        performedBy: String(performedBy),
        notes: note || null
      }
    });
  }

  /**
   * Zoho-Style Allocation: Reserve Stock during Sales Order Creation
   */
  static async reserveStock(params) {
    const client = params.tx || prisma;
    const { productId, warehouseId, quantity } = params;

    const currentStock = await client.stock.findUnique({
      where: {
        productId_warehouseId: { productId, warehouseId }
      }
    });

    const available = (currentStock?.quantity || 0) - (currentStock?.reservedQty || 0);

    if (available < quantity) {
      throw new Error(`Insufficient available stock to reserve. Total physical: ${currentStock?.quantity || 0}, Reserved: ${currentStock?.reservedQty || 0}, Available: ${available}, Requested: ${quantity}`);
    }

    return await client.stock.upsert({
      where: {
        productId_warehouseId: { productId, warehouseId }
      },
      update: {
        reservedQty: { increment: Number(quantity) }
      },
      create: {
        productId,
        warehouseId,
        quantity: 0,
        reservedQty: Number(quantity)
      }
    });
  }

  /**
   * Release reserved stock back or deduct it during shipping
   */
  static async releaseReservation(params) {
    const client = params.tx || prisma;
    const { productId, warehouseId, quantity } = params;

    return await client.stock.update({
      where: {
        productId_warehouseId: { productId, warehouseId }
      },
      data: {
        reservedQty: { decrement: Number(quantity) }
      }
    });
  }
}

module.exports = InventoryService;
