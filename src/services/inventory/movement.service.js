const prisma = require("../../config/prisma");

/**
 * Enterprise Stock Movement Service
 */

/**
 * Creates a stock movement record and atomically updates the running total in the Stock cache table.
 * Must be executed within a transaction context `tx`.
 */
const createStockMovement = async (tx, {
  businessId,
  productId,
  warehouseId,
  quantity, // positive for inbound, negative for outbound
  type, // StockMovementType enum
  referenceType = null,
  referenceId = null,
  performedBy = null,
  notes = null,
  reservedQtyDelta = 0, // optional change in reservedQty
  damagedQtyDelta = 0,  // optional change in damagedQty
  incomingQtyDelta = 0, // optional change in incomingQty
  batchNumber = null,
  serialNumbers = [], // array of serial number strings
  unitCost = 0 // added unit cost
}) => {
  // Validate basic parameters
  if (!businessId || !productId || !warehouseId || quantity === 0 || !type) {
    throw new Error("Invalid parameters for stock movement creation");
  }

  // 1. Fetch or create Stock record for product & warehouse
  let stockRecord = await tx.stock.findUnique({
    where: {
      productId_warehouseId: { productId, warehouseId }
    }
  });

  if (!stockRecord) {
    stockRecord = await tx.stock.create({
      data: {
        productId,
        warehouseId,
        quantity: 0,
        reservedQty: 0,
        damagedQty: 0,
        incomingQty: 0
      }
    });
  }

  // 2. Validate outbound stock limits
  if (quantity < 0) {
    const qtyToDeduct = Math.abs(quantity);
    const available = stockRecord.quantity - stockRecord.reservedQty;
    // We only prevent negative stock if it exceeds available quantity
    if (available < qtyToDeduct) {
      throw new Error(`Insufficient available stock in warehouse. Product ID: ${productId}. Available: ${available}, Requested: ${qtyToDeduct}`);
    }
  }

  // Fetch product for cost tracking
  const product = await tx.product.findUnique({
    where: { id: productId }
  });

  // Fetch valuation method from Settings
  const settings = await tx.settings.findUnique({ where: { businessId } });
  const valMethod = settings?.valuationMethod || "FIFO";

  let cogsAmount = 0;
  let finalUnitCost = unitCost || (product?.costPrice || 0);

  // A. Inbound Stock (Create Layer)
  if (quantity > 0) {
    await tx.inventoryLayer.create({
      data: {
        businessId,
        productId,
        warehouseId,
        quantity,
        remainingQty: quantity,
        unitCost: finalUnitCost,
        referenceType: referenceType || type,
        referenceId: referenceId
      }
    });

    if (valMethod === "WAM") {
      const allLayers = await tx.inventoryLayer.findMany({
        where: { businessId, productId, warehouseId, remainingQty: { gt: 0 } }
      });
      let totalValue = 0;
      let totalQty = 0;
      for (const l of allLayers) {
        totalValue += l.remainingQty * l.unitCost;
        totalQty += l.remainingQty;
      }
      const newAvgCost = totalQty > 0 ? totalValue / totalQty : 0;
      await tx.stock.update({
        where: { id: stockRecord.id },
        data: { averageCost: newAvgCost }
      });
    }
  }

  // B. Outbound Stock (Consume Layers)
  if (quantity < 0) {
    let qtyToDeduct = Math.abs(quantity);

    if (valMethod === "WAM") {
      const avgCost = stockRecord.averageCost || product?.costPrice || 0;
      cogsAmount = qtyToDeduct * avgCost;
      finalUnitCost = avgCost;
    }

    const order = valMethod === "LIFO" ? "desc" : "asc";
    const availableLayers = await tx.inventoryLayer.findMany({
      where: { businessId, productId, warehouseId, remainingQty: { gt: 0 } },
      orderBy: { transactionDate: order }
    });

    for (const layer of availableLayers) {
      if (qtyToDeduct <= 0) break;
      const deductFromLayer = Math.min(layer.remainingQty, qtyToDeduct);
      qtyToDeduct -= deductFromLayer;

      if (valMethod !== "WAM") {
        cogsAmount += deductFromLayer * layer.unitCost;
      }

      const newRemaining = layer.remainingQty - deductFromLayer;
      await tx.inventoryLayer.update({
        where: { id: layer.id },
        data: {
          remainingQty: newRemaining,
          isDepleted: newRemaining <= 0
        }
      });
    }

    if (qtyToDeduct > 0 && valMethod !== "WAM") {
      cogsAmount += qtyToDeduct * (product?.costPrice || 0);
    }
  }

  // 3. Create StockMovement record
  const movement = await tx.stockMovement.create({
    data: {
      businessId,
      productId,
      warehouseId,
      quantity,
      type,
      referenceType,
      referenceId,
      performedBy,
      notes,
      unitCost: finalUnitCost,
      valuationMethod: valMethod
    }
  });

  movement.cogsAmount = cogsAmount;
  movement.valuationMethodUsed = valMethod;

  // 4. Update the Stock cache table
  const updateData = {};
  if (quantity !== 0) {
    updateData.quantity = { increment: quantity };
  }
  if (reservedQtyDelta !== 0) {
    updateData.reservedQty = { increment: reservedQtyDelta };
  }
  if (damagedQtyDelta !== 0) {
    updateData.damagedQty = { increment: damagedQtyDelta };
  }
  if (incomingQtyDelta !== 0) {
    updateData.incomingQty = { increment: incomingQtyDelta };
  }

  if (Object.keys(updateData).length > 0) {
    await tx.stock.update({
      where: { id: stockRecord.id },
      data: updateData
    });
  }

  // 5. Handle Batch and Serial tracking if provided
  if (product) {
    // A. Batch tracking
    if (product.isBatchTracking && batchNumber) {
      // Find or create batch
      let batch = await tx.batch.findUnique({
        where: {
          businessId_productId_batchNumber: {
            businessId,
            productId,
            batchNumber
          }
        }
      });

      if (!batch) {
        batch = await tx.batch.create({
          data: {
            businessId,
            productId,
            batchNumber
          }
        });
      }
      
      // If serials are also tracked, link them to the batch
      if (product.isSerialTracking && serialNumbers && serialNumbers.length > 0) {
        for (const sn of serialNumbers) {
          await tx.serialNumber.upsert({
            where: {
              businessId_productId_serialNumber: {
                businessId,
                productId,
                serialNumber: sn
              }
            },
            create: {
              businessId,
              productId,
              batchId: batch.id,
              serialNumber: sn,
              status: quantity > 0 ? "IN_STOCK" : "SOLD",
              warehouseId: quantity > 0 ? warehouseId : null
            },
            update: {
              status: quantity > 0 ? "IN_STOCK" : "SOLD",
              warehouseId: quantity > 0 ? warehouseId : null,
              batchId: batch.id
            }
          });
        }
      }
    }
    // B. Serial tracking only (no batch)
    else if (product.isSerialTracking && serialNumbers && serialNumbers.length > 0) {
      for (const sn of serialNumbers) {
        await tx.serialNumber.upsert({
          where: {
            businessId_productId_serialNumber: {
              businessId,
              productId,
              serialNumber: sn
            }
          },
          create: {
            businessId,
            productId,
            serialNumber: sn,
            status: quantity > 0 ? "IN_STOCK" : "SOLD",
            warehouseId: quantity > 0 ? warehouseId : null
          },
          update: {
            status: quantity > 0 ? "IN_STOCK" : "SOLD",
            warehouseId: quantity > 0 ? warehouseId : null
          }
        });
      }
    }
  }

  return movement;
};

/**
 * Reserve stock for Sales Orders (increases reservedQty without changing physical quantity)
 */
const reserveStock = async (tx, { businessId, productId, warehouseId, quantity }) => {
  let stockRecord = await tx.stock.findUnique({
    where: {
      productId_warehouseId: { productId, warehouseId }
    }
  });

  if (!stockRecord) {
    stockRecord = await tx.stock.create({
      data: {
        productId,
        warehouseId,
        quantity: 0,
        reservedQty: 0,
        damagedQty: 0,
        incomingQty: 0
      }
    });
  }

  const available = stockRecord.quantity - stockRecord.reservedQty;
  if (available < quantity) {
    throw new Error(`Insufficient stock to reserve. Product: ${productId}, Available: ${available}, Requested: ${quantity}`);
  }

  await tx.stock.update({
    where: { id: stockRecord.id },
    data: {
      reservedQty: { increment: quantity }
    }
  });
};

/**
 * Release reserved stock without fulfilling it (releases reservation back to available pool)
 */
const releaseReservedStock = async (tx, { businessId, productId, warehouseId, quantity }) => {
  const stockRecord = await tx.stock.findUnique({
    where: {
      productId_warehouseId: { productId, warehouseId }
    }
  });

  if (stockRecord) {
    const decrementQty = Math.min(stockRecord.reservedQty, quantity);
    await tx.stock.update({
      where: { id: stockRecord.id },
      data: {
        reservedQty: { decrement: decrementQty }
      }
    });
  }
};

/**
 * Adjust incomingQty for Purchase Orders (increments/decrements when PO is approved/received/cancelled)
 */
const adjustIncomingStock = async (tx, { businessId, productId, warehouseId, quantity }) => {
  let stockRecord = await tx.stock.findUnique({
    where: {
      productId_warehouseId: { productId, warehouseId }
    }
  });

  if (!stockRecord) {
    stockRecord = await tx.stock.create({
      data: {
        productId,
        warehouseId,
        quantity: 0,
        reservedQty: 0,
        damagedQty: 0,
        incomingQty: 0
      }
    });
  }

  await tx.stock.update({
    where: { id: stockRecord.id },
    data: {
      incomingQty: { increment: quantity }
    }
  });
};

module.exports = {
  createStockMovement,
  reserveStock,
  releaseReservedStock,
  adjustIncomingStock
};
