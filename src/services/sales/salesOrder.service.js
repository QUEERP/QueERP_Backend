const prisma = require("../../config/prisma");
const { logAction, triggerNotification } = require("./audit.service");
const { generateDocNumber, calculatePricing } = require("./quotation.service");
const { reserveStock: reserveStockHelper, releaseReservedStock } = require("../inventory/movement.service");

/**
 * Enterprise Stock Reservation logic
 */
const reserveStock = async (tx, businessId, items) => {
  for (const item of items) {
    if (!item.productId) continue;

    if (!item.warehouseId) {
      // Skip stock reservation for items without a warehouse (e.g. service items)
      continue;
    }

    const stockRecord = await tx.stock.findFirst({
      where: {
        productId: item.productId,
        warehouseId: item.warehouseId
      }
    });

    if (!stockRecord) {
      // Optional: Initialize stock record if it doesn't exist
      await tx.stock.create({
        data: {
          productId: item.productId,
          warehouseId: item.warehouseId
        }
      });
    }

    await reserveStockHelper(tx, {
      businessId,
      productId: item.productId,
      warehouseId: item.warehouseId,
      quantity: item.quantity
    });
  }
};

/**
 * Releases reserved stock back to available pool
 */
const releaseStock = async (tx, businessId, items) => {
  for (const item of items) {
    if (!item.productId || !item.warehouseId) continue;

    await releaseReservedStock(tx, {
      businessId,
      productId: item.productId,
      warehouseId: item.warehouseId,
      quantity: item.quantity
    });

  }
};

const createSalesOrder = async (businessId, userId, userEmail, data) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Generate unique SO number
    const orderNumber = await generateDocNumber(tx, businessId, "SO", "salesOrder", "orderNumber");

    // 2. Compute pricing
    const pricing = calculatePricing(data.items);

    // 3. Create Sales Order
    const salesOrder = await tx.salesOrder.create({
      data: {
        businessId,
        orderNumber,
        customerId: data.customerId,
        contactId: data.contactId || null,
        quotationId: data.quotationId || null,
        dealId: data.dealId || null,
        assignedToId: data.assignedToId || null,
        status: "DRAFT",
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        discount: pricing.discount,
        totalAmount: pricing.totalAmount,
        currency: data.currency || "INR",
        termsConditions: data.termsConditions || null,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        notes: data.notes || null,
        items: {
          create: pricing.processedItems
        }
      },
      include: {
        items: true,
        customer: true
      }
    });

    // 4. Reserve Stock
    await reserveStock(tx, businessId, pricing.processedItems);

    // 5. Log & Notify
    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "SALES_ORDER_CREATED",
      entityType: "SalesOrder",
      entityId: salesOrder.id,
      details: { orderNumber, totalAmount: pricing.totalAmount }
    });

    await triggerNotification(tx, {
      businessId,
      title: "New Sales Order Created",
      message: `Sales Order ${orderNumber} created. Stock has been reserved.`,
      type: "SUCCESS",
      entityType: "SalesOrder",
      entityId: salesOrder.id
    });

    return salesOrder;
  });
};

const convertQuotationToSalesOrder = async (businessId, userId, userEmail, quotationId) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch quotation
    const quotation = await tx.quotation.findFirst({
      where: { id: quotationId, businessId, isDeleted: false },
      include: { items: true }
    });

    if (!quotation) {
      throw new Error("Quotation not found");
    }

    if (quotation.status === "EXPIRED" || quotation.status === "CANCELLED") {
      throw new Error(`Cannot convert quotation in ${quotation.status} status.`);
    }

    // 2. Generate unique SO number
    const orderNumber = await generateDocNumber(tx, businessId, "SO", "salesOrder", "orderNumber");

    // 3. Process items
    const processedItems = quotation.items.map((item) => ({
      productId: item.productId,
      description: item.description,
      itemType: item.itemType,
      hsnSacCode: item.hsnSacCode,
      quantity: item.quantity,
      price: item.price,
      taxPercent: item.taxPercent,
      taxDetails: item.taxDetails || [],
      discount: item.discount || 0,
      total: item.total
    }));

    // 4. Create Sales Order
    const salesOrder = await tx.salesOrder.create({
      data: {
        businessId,
        orderNumber,
        customerId: quotation.customerId,
        contactId: quotation.contactId,
        quotationId: quotation.id,
        dealId: quotation.dealId,
        assignedToId: quotation.assignedToId,
        status: "CONFIRMED",
        subtotal: quotation.subtotal,
        tax: quotation.tax,
        discount: quotation.discount,
        totalAmount: quotation.totalAmount,
        currency: quotation.currency,
        termsConditions: quotation.termsConditions,
        orderDate: new Date(),
        items: {
          create: processedItems
        }
      },
      include: {
        items: true,
        customer: true
      }
    });

    // 5. Reserve Stock
    await reserveStock(tx, businessId, processedItems);

    // 6. Update Quotation Status
    await tx.quotation.update({
      where: { id: quotationId },
      data: { status: "ACCEPTED" }
    });

    // 7. Log & Notify
    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "SALES_ORDER_CONVERTED_FROM_QUOTATION",
      entityType: "SalesOrder",
      entityId: salesOrder.id,
      details: { quotationId, quoteNumber: quotation.quoteNumber, orderNumber }
    });

    await triggerNotification(tx, {
      businessId,
      title: "Sales Order Converted",
      message: `Quotation ${quotation.quoteNumber} converted to Sales Order ${orderNumber}.`,
      type: "SUCCESS",
      entityType: "SalesOrder",
      entityId: salesOrder.id
    });

    return salesOrder;
  });
};

const updateSalesOrder = async (businessId, userId, userEmail, orderId, data) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.salesOrder.findFirst({
      where: { id: orderId, businessId, isDeleted: false },
      include: { items: true }
    });

    if (!existing) {
      throw new Error("Sales Order not found");
    }

    if (existing.status === "CANCELLED" || existing.status === "FULFILLED") {
      throw new Error(`Cannot update order in ${existing.status} status.`);
    }

    let pricing = {};
    if (data.items) {
      // 1. Release previous stock reservation
      await releaseStock(tx, businessId, existing.items);

      // 2. Calculate new pricing
      pricing = calculatePricing(data.items);

      // 3. Delete old items
      await tx.salesOrderItem.deleteMany({
        where: { salesOrderId: orderId }
      });

      // 4. Reserve new stock
      await reserveStock(tx, businessId, pricing.processedItems);
    }

    const updated = await tx.salesOrder.update({
      where: { id: orderId },
      data: {
        customerId: data.customerId || existing.customerId,
        contactId: data.contactId !== undefined ? data.contactId : existing.contactId,
        dealId: data.dealId !== undefined ? data.dealId : existing.dealId,
        assignedToId: data.assignedToId !== undefined ? data.assignedToId : existing.assignedToId,
        status: data.status ? data.status.toUpperCase() : existing.status,
        subtotal: pricing.subtotal !== undefined ? pricing.subtotal : existing.subtotal,
        tax: pricing.tax !== undefined ? pricing.tax : existing.tax,
        discount: pricing.discount !== undefined ? pricing.discount : existing.discount,
        totalAmount: pricing.totalAmount !== undefined ? pricing.totalAmount : existing.totalAmount,
        currency: data.currency || existing.currency,
        termsConditions: data.termsConditions !== undefined ? data.termsConditions : existing.termsConditions,
        orderDate: data.orderDate ? new Date(data.orderDate) : existing.orderDate,
        deliveryDate: data.deliveryDate !== undefined ? (data.deliveryDate ? new Date(data.deliveryDate) : null) : existing.deliveryDate,
        notes: data.notes !== undefined ? data.notes : existing.notes,
        items: data.items ? {
          create: pricing.processedItems
        } : undefined
      },
      include: {
        items: true,
        customer: true
      }
    });

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "SALES_ORDER_UPDATED",
      entityType: "SalesOrder",
      entityId: updated.id,
      details: { orderNumber: updated.orderNumber }
    });

    return updated;
  });
};

const getSalesOrderById = async (businessId, orderId) => {
  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, businessId, isDeleted: false },
    include: {
      items: true,
      customer: true,
      contact: true,
      quotation: true,
      deal: true,
      invoices: true,
      assignedTo: {
        select: {
          id: true,
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!order) {
    throw new Error("Sales Order not found");
  }

  return order;
};

const deleteSalesOrder = async (businessId, userId, userEmail, orderId) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.salesOrder.findFirst({
      where: { id: orderId, businessId, isDeleted: false },
      include: { items: true }
    });

    if (!existing) {
      throw new Error("Sales Order not found");
    }

    // Release stock reservation
    await releaseStock(tx, businessId, existing.items);

    await tx.salesOrder.update({
      where: { id: orderId },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "SALES_ORDER_DELETED",
      entityType: "SalesOrder",
      entityId: orderId,
      details: { orderNumber: existing.orderNumber }
    });

    return true;
  });
};

const changeStatus = async (businessId, userId, userEmail, orderId, status) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.salesOrder.findFirst({
      where: { id: orderId, businessId, isDeleted: false },
      include: { items: true }
    });

    if (!existing) {
      throw new Error("Sales Order not found");
    }

    const updated = await tx.salesOrder.update({
      where: { id: orderId },
      data: { status: status.toUpperCase() }
    });

    // If order is cancelled, release reserved stock
    if (status === "CANCELLED") {
      await releaseStock(tx, businessId, existing.items);
    }

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "SALES_ORDER_STATUS_CHANGED",
      entityType: "SalesOrder",
      entityId: orderId,
      details: { oldStatus: existing.status, newStatus: status, orderNumber: existing.orderNumber }
    });

    await triggerNotification(tx, {
      businessId,
      title: "Sales Order Status Changed",
      message: `Sales Order ${existing.orderNumber} status changed to ${status}.`,
      type: status === "CONFIRMED" || status === "FULFILLED" ? "SUCCESS" : "INFO",
      entityType: "SalesOrder",
      entityId: orderId
    });

    return updated;
  });
};

module.exports = {
  createSalesOrder,
  convertQuotationToSalesOrder,
  updateSalesOrder,
  getSalesOrderById,
  deleteSalesOrder,
  changeStatus,
  reserveStock,
  releaseStock
};
