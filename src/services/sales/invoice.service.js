const prisma = require("../../config/prisma");
const { logAction, triggerNotification } = require("./audit.service");
const { generateDocNumber, calculatePricing } = require("./quotation.service");
const { releaseStock } = require("./salesOrder.service");
const { createStockMovement } = require("../inventory/movement.service");

/**
 * Deducts stock from physical inventory upon dispatch (invoice creation)
 */
const deductStock = async (tx, businessId, items, isFromReservation = false) => {
  for (const item of items) {
    if (!item.productId) continue;

    const stockRecord = await tx.stock.findFirst({
      where: {
        productId: item.productId,
        warehouse: { businessId }
      }
    });

    if (stockRecord) {
      const reservedQtyDelta = isFromReservation ? -Math.min(stockRecord.reservedQty, item.quantity) : 0;
      await createStockMovement(tx, {
        businessId,
        productId: item.productId,
        warehouseId: stockRecord.warehouseId,
        quantity: -item.quantity,
        type: "SALE_OUT",
        referenceType: "INVOICE",
        notes: "Auto-deducted upon sales invoice creation",
        reservedQtyDelta
      });
    }
  }
};

/**
 * Restores dispatched stock back to inventory (invoice cancel/deletion)
 */
const restoreStock = async (tx, businessId, items) => {
  for (const item of items) {
    if (!item.productId) continue;

    const stockRecord = await tx.stock.findFirst({
      where: {
        productId: item.productId,
        warehouse: { businessId }
      }
    });

    if (stockRecord) {
      await createStockMovement(tx, {
        businessId,
        productId: item.productId,
        warehouseId: stockRecord.warehouseId,
        quantity: item.quantity,
        type: "RETURN_IN",
        referenceType: "INVOICE",
        notes: "Restored upon invoice cancellation/deletion"
      });
    }
  }
};

const createInvoice = async (businessId, userId, userEmail, data) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Generate unique invoice number
    const invoiceNumber = await generateDocNumber(tx, businessId, "INV", "invoice", "invoiceNumber");

    // 2. Compute pricing
    const pricing = calculatePricing(data.items);

    // 3. Process invoice items with backward compatibility fields (hours, rate, amount)
    const processedItems = pricing.processedItems.map((item) => {
      const orig = data.items.find(i => i.productId === item.productId || i.description === item.description) || {};
      const base = {
        ...item,
        hours: Number(orig.hours || 0),
        rate: Number(orig.rate || item.price),
        amount: item.total, // backward compatibility mapping
        totalTax: item.total * (item.taxPercent / (100 + item.taxPercent)), // approximate tax amount in total
        totalAmount: item.total
      };
      // Remove any leftover productId field
      delete base.productId;
      if (item.productId) {
        base.product = { connect: { id: item.productId } };
      }
      return base;
    });

    // 4. Create Invoice
    const invoice = await tx.invoice.create({
      data: {
        businessId,
        invoiceNumber,
        customerId: data.customerId,
        contactId: data.contactId || null,
        quotationId: data.quotationId || null,
        salesOrderId: data.salesOrderId || null,
        status: "DRAFT",
        subtotal: pricing.subtotal,
        totalTax: pricing.tax,
        discount: pricing.discount,
        grandTotal: pricing.totalAmount,
        currency: data.currency || "INR",
        poNumber: data.poNumber || null,
        poDate: data.poDate ? new Date(data.poDate) : null,
        soNumber: data.soNumber || null,
        soDate: data.soDate ? new Date(data.soDate) : null,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        terms: data.terms || null,
        adminNote: data.adminNote || null,
        designTemplate: data.designTemplate || "modern",
        projectId: data.projectId || null,
        items: {
          create: processedItems
        }
      },
      include: {
        items: true,
        customer: true
      }
    });

    // 5. Deduct Stock immediately from physical inventory
    await deductStock(tx, businessId, pricing.processedItems, false);

    // 6. Log & Notify
    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "INVOICE_CREATED",
      entityType: "Invoice",
      entityId: invoice.id,
      details: { invoiceNumber, grandTotal: pricing.totalAmount }
    });

    await triggerNotification(tx, {
      businessId,
      title: "New Invoice Billed",
      message: `Invoice ${invoiceNumber} drafted. Stock dispatched.`,
      type: "SUCCESS",
      entityType: "Invoice",
      entityId: invoice.id
    });

    return invoice;
  });
};

const convertSalesOrderToInvoice = async (businessId, userId, userEmail, salesOrderId) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch Sales Order
    const salesOrder = await tx.salesOrder.findFirst({
      where: { id: salesOrderId, businessId, isDeleted: false },
      include: { items: true }
    });

    if (!salesOrder) {
      throw new Error("Sales Order not found");
    }

    if (salesOrder.status === "CANCELLED" || salesOrder.status === "FULFILLED") {
      throw new Error(`Cannot bill sales order in ${salesOrder.status} status.`);
    }

    // 2. Generate unique invoice number
    const invoiceNumber = await generateDocNumber(tx, businessId, "INV", "invoice", "invoiceNumber");

    // 3. Process items copying from sales order, including backward compatibility fields
    const processedItems = salesOrder.items.map((item) => {
      const base = {
        description: item.description,
        itemType: item.itemType,
        hsnSacCode: item.hsnSacCode,
        quantity: item.quantity,
        taxPercent: item.taxPercent,
        taxDetails: item.taxDetails || [],
        discount: item.discount || 0,
        hours: 0,
        rate: item.price,
        amount: item.total,
        totalTax: item.total * ((item.taxPercent || 0) / (100 + (item.taxPercent || 0))),
        totalAmount: item.total
      };
      if (item.productId) {
        base.product = { connect: { id: item.productId } };
      }
      return base;
    });

    // 4. Create Invoice
    const invoice = await tx.invoice.create({
      data: {
        businessId,
        invoiceNumber,
        customerId: salesOrder.customerId,
        contactId: salesOrder.contactId,
        quotationId: salesOrder.quotationId,
        salesOrderId: salesOrder.id,
        status: "APPROVED",
        subtotal: salesOrder.subtotal,
        totalTax: salesOrder.tax,
        discount: salesOrder.discount,
        grandTotal: salesOrder.totalAmount,
        currency: salesOrder.currency,
        terms: salesOrder.termsConditions,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Default 15 days due date
        soNumber: salesOrder.orderNumber,
        soDate: salesOrder.orderDate,
        items: {
          create: processedItems
        }
      },
      include: {
        items: true,
        customer: true
      }
    });

    // 5. Deduct Stock, recognizing it was previously reserved by Sales Order
    await deductStock(tx, businessId, processedItems, true);

    // 6. Complete Sales Order Fulfill Status
    await tx.salesOrder.update({
      where: { id: salesOrderId },
      data: { status: "FULFILLED" }
    });

    // 7. Log & Notify
    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "INVOICE_CONVERTED_FROM_SALES_ORDER",
      entityType: "Invoice",
      entityId: invoice.id,
      details: { salesOrderId, orderNumber: salesOrder.orderNumber, invoiceNumber }
    });

    await triggerNotification(tx, {
      businessId,
      title: "Invoice Billed",
      message: `Invoice ${invoiceNumber} created from Sales Order ${salesOrder.orderNumber}. Stock reservation dispatched.`,
      type: "SUCCESS",
      entityType: "Invoice",
      entityId: invoice.id
    });

    return invoice;
  });
};

const updateInvoice = async (businessId, userId, userEmail, invoiceId, data) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: { id: invoiceId, businessId, isDeleted: false },
      include: { items: true }
    });

    if (!existing) {
      throw new Error("Invoice not found");
    }

    if (existing.status === "PAID" || existing.status === "CANCELLED") {
      throw new Error(`Cannot edit invoice in ${existing.status} status.`);
    }

    let pricing = {};
    if (data.items) {
      // Restore previous dispatched stock
      await restoreStock(tx, businessId, existing.items);

      // Compute pricing
      pricing = calculatePricing(data.items);

      // Process invoice items
      const processedItems = pricing.processedItems.map((item) => {
        const orig = data.items.find(i => i.productId === item.productId || i.description === item.description) || {};
        const base = {
          ...item,
          hours: Number(orig.hours || 0),
          rate: Number(orig.rate || item.price),
          amount: item.total,
          totalTax: item.total * (item.taxPercent / (100 + item.taxPercent)),
          totalAmount: item.total
        };
        // Remove productId field regardless of its value
        delete base.productId;
        if (item.productId) {
          base.product = { connect: { id: item.productId } };
        }
        return base;
      });

      // Delete old items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId }
      });

      // Deduct new physical stock
      await deductStock(tx, businessId, pricing.processedItems, false);

      pricing.processedItems = processedItems;
    }

    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        customerId: data.customerId || existing.customerId,
        contactId: data.contactId !== undefined ? data.contactId : existing.contactId,
        quotationId: data.quotationId !== undefined ? data.quotationId : existing.quotationId,
        salesOrderId: data.salesOrderId !== undefined ? data.salesOrderId : existing.salesOrderId,
        status: data.status || existing.status,
        subtotal: pricing.subtotal !== undefined ? pricing.subtotal : existing.subtotal,
        totalTax: pricing.tax !== undefined ? pricing.tax : existing.totalTax,
        discount: pricing.discount !== undefined ? pricing.discount : existing.discount,
        grandTotal: pricing.totalAmount !== undefined ? pricing.totalAmount : existing.grandTotal,
        currency: data.currency || existing.currency,
        poNumber: data.poNumber !== undefined ? data.poNumber : existing.poNumber,
        poDate: data.poDate !== undefined ? (data.poDate ? new Date(data.poDate) : null) : existing.poDate,
        soNumber: data.soNumber !== undefined ? data.soNumber : existing.soNumber,
        soDate: data.soDate !== undefined ? (data.soDate ? new Date(data.soDate) : null) : existing.soDate,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : existing.invoiceDate,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : existing.dueDate,
        terms: data.terms !== undefined ? data.terms : existing.terms,
        adminNote: data.adminNote !== undefined ? data.adminNote : existing.adminNote,
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
      action: "INVOICE_UPDATED",
      entityType: "Invoice",
      entityId: updated.id,
      details: { invoiceNumber: updated.invoiceNumber }
    });

    return updated;
  });
};

const getInvoiceById = async (businessId, invoiceId) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId, isDeleted: false },
    include: {
      items: true,
      customer: true,
      contact: true,
      quotation: true,
      salesOrder: true,
      payments: true,
      creditNotes: true,
      project: true
    }
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  return invoice;
};

const deleteInvoice = async (businessId, userId, userEmail, invoiceId) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: { id: invoiceId, businessId, isDeleted: false },
      include: { items: true }
    });

    if (!existing) {
      throw new Error("Invoice not found");
    }

    // Restore stock to inventory
    await restoreStock(tx, businessId, existing.items);

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "INVOICE_DELETED",
      entityType: "Invoice",
      entityId: invoiceId,
      details: { invoiceNumber: existing.invoiceNumber }
    });

    return true;
  });
};

const changeStatus = async (businessId, userId, userEmail, invoiceId, status) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: { id: invoiceId, businessId, isDeleted: false },
      include: { items: true }
    });

    if (!existing) {
      throw new Error("Invoice not found");
    }

    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: { status }
    });

    // If invoice is cancelled, restore physical inventory stock
    if (status === "CANCELLED") {
      await restoreStock(tx, businessId, existing.items);
    }

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "INVOICE_STATUS_CHANGED",
      entityType: "Invoice",
      entityId: invoiceId,
      details: { oldStatus: existing.status, newStatus: status, invoiceNumber: existing.invoiceNumber }
    });

    await triggerNotification(tx, {
      businessId,
      title: "Invoice Status Updated",
      message: `Invoice ${existing.invoiceNumber} status is now ${status}.`,
      type: status === "PAID" ? "SUCCESS" : "INFO",
      entityType: "Invoice",
      entityId: invoiceId
    });

    return updated;
  });
};

module.exports = {
  createInvoice,
  convertSalesOrderToInvoice,
  updateInvoice,
  getInvoiceById,
  deleteInvoice,
  changeStatus,
  deductStock,
  restoreStock
};
