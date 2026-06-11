const prisma = require("../../config/prisma");
const { logAction } = require("../sales/audit.service");
const { generateDocNumber } = require("../sales/quotation.service");
const { adjustIncomingStock } = require("../inventory/movement.service");

const getPagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const calculatePOPricing = (items) => {
  let subtotal = 0;
  let totalTax = 0;

  const processedItems = items.map(item => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    const taxPercent = parseFloat(item.taxPercent) || 0;
    
    const itemSubtotal = qty * price;
    const itemTax = itemSubtotal * (taxPercent / 100);
    const itemTotal = itemSubtotal + itemTax;

    subtotal += itemSubtotal;
    totalTax += itemTax;

    return {
      productId: item.productId || null,
      description: item.description,
      itemType: item.itemType || "GOODS",
      hsnSacCode: item.hsnSacCode || null,
      quantity: qty,
      price: price,
      taxPercent: taxPercent,
      total: itemTotal
    };
  });

  const totalAmount = subtotal + totalTax;

  return {
    subtotal,
    tax: totalTax,
    totalAmount,
    processedItems
  };
};

const createPurchaseOrder = async (businessId, userId, userEmail, data) => {
  return await prisma.$transaction(async (tx) => {
    // Generate unique PO number
    const poNumber = await generateDocNumber(tx, businessId, "PO", "purchaseOrder", "poNumber");

    // Calculate Pricing
    const pricing = calculatePOPricing(data.items);

    const purchaseOrder = await tx.purchaseOrder.create({
      data: {
        businessId,
        poNumber,
        vendorId: data.vendorId,
        warehouseId: data.warehouseId || null,
        assignedToId: data.assignedToId || null,
        status: data.status || "DRAFT",
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        discount: data.discount ? parseFloat(data.discount) : 0,
        totalAmount: pricing.totalAmount - (data.discount ? parseFloat(data.discount) : 0),
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        notes: data.notes || null,
        items: {
          create: pricing.processedItems
        }
      },
      include: {
        items: true,
        vendor: true
      }
    });

    // If initial status is APPROVED, adjust incoming stock
    if (purchaseOrder.status === "APPROVED" && purchaseOrder.warehouseId) {
      for (const item of pricing.processedItems) {
        if (item.productId && item.itemType === "GOODS") {
          await adjustIncomingStock(tx, {
            businessId,
            productId: item.productId,
            warehouseId: purchaseOrder.warehouseId,
            quantity: item.quantity
          });
        }
      }
    }

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "PURCHASE_ORDER_CREATED",
      module: "PURCHASE",
      entityType: "PurchaseOrder",
      entityId: purchaseOrder.id,
      details: { poNumber, totalAmount: purchaseOrder.totalAmount }
    });

    return purchaseOrder;
  });
};

const getPurchaseOrders = async (businessId, query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const where = { businessId };

  if (query.status) {
    where.status = query.status;
  }
  if (query.vendorId) {
    where.vendorId = query.vendorId;
  }
  if (query.search) {
    where.poNumber = { contains: query.search, mode: "insensitive" };
  }

  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder || "desc";
  const orderBy = { [sortBy]: sortOrder };

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: limit,
      include: {
        vendor: { select: { id: true, name: true, companyName: true } },
        warehouse: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } }
          }
        }
      },
      orderBy
    }),
    prisma.purchaseOrder.count({ where })
  ]);

  return {
    orders,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

const getPurchaseOrderById = async (businessId, id) => {
  const order = await prisma.purchaseOrder.findFirst({
    where: { id, businessId },
    include: {
      vendor: true,
      warehouse: true,
      items: {
        include: {
          product: true
        }
      },
      goodsReceiveNotes: true,
      bills: true
    }
  });

  if (!order) throw new Error("Purchase Order not found");
  return order;
};

const updatePurchaseOrder = async (businessId, userId, userEmail, id, data) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.purchaseOrder.findFirst({
      where: { id, businessId },
      include: { items: true }
    });

    if (!existing) throw new Error("Purchase Order not found");
    if (existing.status !== "DRAFT" && existing.status !== "PENDING_APPROVAL") {
      throw new Error(`Cannot update purchase order in ${existing.status} status.`);
    }

    let pricing = {};
    if (data.items) {
      // If previously approved, reverse previous incoming stock
      if (existing.status === "APPROVED" && existing.warehouseId) {
        for (const item of existing.items) {
          if (item.productId && item.itemType === "GOODS") {
            await adjustIncomingStock(tx, {
              businessId,
              productId: item.productId,
              warehouseId: existing.warehouseId,
              quantity: -item.quantity
            });
          }
        }
      }

      pricing = calculatePOPricing(data.items);

      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id }
      });
    }

    const discountVal = data.discount !== undefined ? parseFloat(data.discount) : existing.discount;
    const subtotalVal = pricing.subtotal !== undefined ? pricing.subtotal : existing.subtotal;
    const taxVal = pricing.tax !== undefined ? pricing.tax : existing.tax;
    const totalVal = (pricing.totalAmount !== undefined ? pricing.totalAmount : (existing.subtotal + existing.tax)) - discountVal;

    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: {
        vendorId: data.vendorId || existing.vendorId,
        warehouseId: data.warehouseId !== undefined ? data.warehouseId : existing.warehouseId,
        assignedToId: data.assignedToId !== undefined ? data.assignedToId : existing.assignedToId,
        status: data.status || existing.status,
        subtotal: subtotalVal,
        tax: taxVal,
        discount: discountVal,
        totalAmount: totalVal,
        orderDate: data.orderDate ? new Date(data.orderDate) : existing.orderDate,
        expectedDeliveryDate: data.expectedDeliveryDate !== undefined ? (data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null) : existing.expectedDeliveryDate,
        notes: data.notes !== undefined ? data.notes : existing.notes,
        items: data.items ? {
          create: pricing.processedItems
        } : undefined
      },
      include: {
        items: true
      }
    });

    // If new status is APPROVED and warehouse is set, adjust incoming stock
    if (updated.status === "APPROVED" && updated.warehouseId) {
      const itemsToAdjust = data.items ? pricing.processedItems : existing.items;
      for (const item of itemsToAdjust) {
        if (item.productId && (item.itemType === "GOODS" || item.product?.type === "GOODS")) {
          await adjustIncomingStock(tx, {
            businessId,
            productId: item.productId,
            warehouseId: updated.warehouseId,
            quantity: item.quantity
          });
        }
      }
    }

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "PURCHASE_ORDER_UPDATED",
      module: "PURCHASE",
      entityType: "PurchaseOrder",
      entityId: id,
      details: { poNumber: updated.poNumber }
    });

    return updated;
  });
};

const changePOStatus = async (businessId, userId, userEmail, id, status) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.purchaseOrder.findFirst({
      where: { id, businessId },
      include: { items: true }
    });

    if (!existing) throw new Error("Purchase Order not found");
    if (existing.status === status) return existing;

    // Handle incoming stock changes based on status transition
    if (status === "APPROVED" && existing.warehouseId) {
      for (const item of existing.items) {
        if (item.productId && item.itemType === "GOODS") {
          await adjustIncomingStock(tx, {
            businessId,
            productId: item.productId,
            warehouseId: existing.warehouseId,
            quantity: item.quantity
          });
        }
      }
    } else if (status === "CANCELLED" && existing.status === "APPROVED" && existing.warehouseId) {
      // Deduct incoming stock because it is cancelled
      for (const item of existing.items) {
        if (item.productId && item.itemType === "GOODS") {
          await adjustIncomingStock(tx, {
            businessId,
            productId: item.productId,
            warehouseId: existing.warehouseId,
            quantity: -item.quantity
          });
        }
      }
    }

    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: { status },
      include: { items: true }
    });

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "PURCHASE_ORDER_STATUS_CHANGED",
      module: "PURCHASE",
      entityType: "PurchaseOrder",
      entityId: id,
      details: { poNumber: existing.poNumber, oldStatus: existing.status, newStatus: status }
    });

    return updated;
  });
};

module.exports = {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  changePOStatus,
  calculatePOPricing
};
