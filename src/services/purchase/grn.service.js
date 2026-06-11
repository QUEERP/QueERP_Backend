const prisma = require("../../config/prisma");
const { logAction } = require("../sales/audit.service");
const { generateDocNumber } = require("../sales/quotation.service");
const { createStockMovement, adjustIncomingStock } = require("../inventory/movement.service");

const getPagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const createGRN = async (businessId, userId, userEmail, data) => {
  return await prisma.$transaction(async (tx) => {
    // Generate GRN Number
    const grnNumber = await generateDocNumber(tx, businessId, "GRN", "goodsReceiveNote", "grnNumber");

    const grn = await tx.goodsReceiveNote.create({
      data: {
        businessId,
        grnNumber,
        purchaseOrderId: data.purchaseOrderId || null,
        vendorId: data.vendorId,
        warehouseId: data.warehouseId,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
        status: "RECEIVED",
        notes: data.notes || null,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantityOrdered: parseFloat(item.quantityOrdered),
            quantityReceived: parseFloat(item.quantityReceived),
            quantityDamaged: parseFloat(item.quantityDamaged || 0),
            price: parseFloat(item.price || 0),
            batchNumber: item.batchNumber || null,
            serialNumbers: item.serialNumbers || []
          }))
        }
      },
      include: {
        items: true,
        purchaseOrder: true
      }
    });

    // Execute Stock Movements & Adjustments
    for (const item of data.items) {
      const qtyReceived = parseFloat(item.quantityReceived);
      const qtyDamaged = parseFloat(item.quantityDamaged || 0);
      const netQty = qtyReceived - qtyDamaged;

      // 1. Inbound stock movement for good items
      if (netQty > 0) {
        await createStockMovement(tx, {
          businessId,
          productId: item.productId,
          warehouseId: data.warehouseId,
          quantity: netQty,
          type: "PURCHASE_IN",
          referenceType: "GRN",
          referenceId: grn.id,
          performedBy: userEmail,
          notes: `Goods received via GRN: ${grnNumber}`,
          batchNumber: item.batchNumber || null,
          serialNumbers: item.serialNumbers || []
        });
      }

      // 2. Inbound stock movement for damaged items (increment physical and damaged separately)
      if (qtyDamaged > 0) {
        await createStockMovement(tx, {
          businessId,
          productId: item.productId,
          warehouseId: data.warehouseId,
          quantity: qtyDamaged,
          type: "PURCHASE_IN",
          referenceType: "GRN",
          referenceId: grn.id,
          performedBy: userEmail,
          notes: `Damaged goods received via GRN: ${grnNumber}`,
          damagedQtyDelta: qtyDamaged,
          batchNumber: item.batchNumber || null,
          serialNumbers: item.serialNumbers || [] // note: serials of damaged items
        });
      }

      // 3. Deduct from incomingQty (since they are now physical stock in the warehouse)
      if (data.purchaseOrderId) {
        await adjustIncomingStock(tx, {
          businessId,
          productId: item.productId,
          warehouseId: data.warehouseId,
          quantity: -qtyReceived
        });
      }
    }

    // 4. If linked to a PO, update the PO status
    if (data.purchaseOrderId) {
      await updatePOReceivedStatus(tx, businessId, data.purchaseOrderId);
    }

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "GRN_CREATED",
      module: "PURCHASE",
      entityType: "GoodsReceiveNote",
      entityId: grn.id,
      details: { grnNumber, purchaseOrderId: data.purchaseOrderId }
    });

    return grn;
  });
};

const updatePOReceivedStatus = async (tx, businessId, poId) => {
  const po = await tx.purchaseOrder.findFirst({
    where: { id: poId, businessId },
    include: { items: true, goodsReceiveNotes: { include: { items: true } } }
  });

  if (!po) return;

  // Calculate total quantity ordered vs received
  const orderedQtyMap = {};
  for (const item of po.items) {
    if (item.productId) {
      orderedQtyMap[item.productId] = (orderedQtyMap[item.productId] || 0) + item.quantity;
    }
  }

  const receivedQtyMap = {};
  for (const grn of po.goodsReceiveNotes) {
    if (grn.status !== "CANCELLED") {
      for (const item of grn.items) {
        if (item.productId) {
          receivedQtyMap[item.productId] = (receivedQtyMap[item.productId] || 0) + item.quantityReceived;
        }
      }
    }
  }

  let fullyReceived = true;
  let partialReceived = false;

  for (const productId of Object.keys(orderedQtyMap)) {
    const ordered = orderedQtyMap[productId];
    const received = receivedQtyMap[productId] || 0;

    if (received < ordered) {
      fullyReceived = false;
    }
    if (received > 0) {
      partialReceived = true;
    }
  }

  let newStatus = po.status;
  if (fullyReceived) {
    newStatus = "FULLY_RECEIVED";
  } else if (partialReceived) {
    newStatus = "PARTIAL_RECEIVED";
  }

  if (newStatus !== po.status) {
    await tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: newStatus }
    });
  }
};

const getGRNs = async (businessId, query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const where = { businessId };

  if (query.purchaseOrderId) {
    where.purchaseOrderId = query.purchaseOrderId;
  }
  if (query.vendorId) {
    where.vendorId = query.vendorId;
  }
  if (query.search) {
    where.grnNumber = { contains: query.search, mode: "insensitive" };
  }

  const [grns, total] = await Promise.all([
    prisma.goodsReceiveNote.findMany({
      where,
      skip,
      take: limit,
      include: {
        vendor: { select: { id: true, name: true, companyName: true } },
        warehouse: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, poNumber: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.goodsReceiveNote.count({ where })
  ]);

  return {
    grns,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

const getGRNById = async (businessId, id) => {
  const grn = await prisma.goodsReceiveNote.findFirst({
    where: { id, businessId },
    include: {
      vendor: true,
      warehouse: true,
      purchaseOrder: true,
      items: {
        include: {
          product: true
        }
      },
      bills: true
    }
  });

  if (!grn) throw new Error("GRN not found");
  return grn;
};

module.exports = {
  createGRN,
  getGRNs,
  getGRNById
};
