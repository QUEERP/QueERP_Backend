const prisma = require("../../config/prisma");
const { logAction, triggerNotification } = require("./audit.service");

/**
 * Robust document number generator preventing duplicates and collision on deletion.
 */
const generateDocNumber = async (tx, businessId, prefix, modelName, fieldName) => {
  const lastRecord = await tx[modelName].findFirst({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    select: { [fieldName]: true }
  });
  if (!lastRecord || !lastRecord[fieldName]) {
    return `${prefix}-001`;
  }
  const parts = lastRecord[fieldName].split("-");
  const numStr = parts[parts.length - 1];
  const nextNum = isNaN(parseInt(numStr, 10)) ? 1 : parseInt(numStr, 10) + 1;
  return `${prefix}-${String(nextNum).padStart(3, "0")}`;
};

/**
 * Calculates item totals and aggregates.
 */
const calculatePricing = (items) => {
  let subtotal = 0;
  let totalTax = 0;
  let totalDiscount = 0;

  const processedItems = items.map((item) => {
    const qty = Number(item.quantity || 0);
    const prc = Number(item.price || 0);
    const disc = Number(item.discount || 0);
    const taxRate = Number(item.taxPercent || 0);

    const baseAmount = qty * prc;
    const itemDiscount = disc;
    const taxableAmount = Math.max(baseAmount - itemDiscount, 0);
    const itemTax = taxableAmount * (taxRate / 100);
    const total = taxableAmount + itemTax;

    subtotal += baseAmount;
    totalTax += itemTax;
    totalDiscount += itemDiscount;

    return {
      productId: item.productId || null,
      warehouseId: item.warehouseId || null,
      description: item.description,
      itemType: item.itemType || "GOODS",
      hsnSacCode: item.hsnSacCode || null,
      quantity: qty,
      price: prc,
      taxPercent: taxRate,
      taxDetails: item.taxDetails || [],
      discount: itemDiscount,
      total
    };
  });

  const totalAmount = subtotal + totalTax - totalDiscount;

  return {
    subtotal,
    tax: totalTax,
    discount: totalDiscount,
    totalAmount,
    processedItems
  };
};

const createQuotation = async (businessId, userId, userEmail, data) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Generate unique quote number
    const quoteNumber = await generateDocNumber(tx, businessId, "QT", "quotation", "quoteNumber");

    // 2. Compute pricing
    const pricing = calculatePricing(data.items);

    // 3. Create Quotation and Items
    const quotation = await tx.quotation.create({
      data: {
        businessId,
        quoteNumber,
        title: data.title || null,
        customerId: data.customerId,
        contactId: data.contactId || null,
        dealId: data.dealId || null,
        assignedToId: data.assignedToId || null,
        status: "DRAFT",
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        discount: pricing.discount,
        totalAmount: pricing.totalAmount,
        currency: data.currency || "INR",
        termsConditions: data.termsConditions || null,
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
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

    // 4. Log Action & Notification
    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "QUOTATION_CREATED",
      entityType: "Quotation",
      entityId: quotation.id,
      details: { quoteNumber, totalAmount: pricing.totalAmount }
    });

    await triggerNotification(tx, {
      businessId,
      title: "New Quotation Created",
      message: `Quotation ${quoteNumber} of amount ${pricing.totalAmount} ${quotation.currency} has been drafted.`,
      type: "SUCCESS",
      entityType: "Quotation",
      entityId: quotation.id
    });

    return quotation;
  });
};

const updateQuotation = async (businessId, userId, userEmail, quotationId, data) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.quotation.findFirst({
      where: { id: quotationId, businessId, isDeleted: false }
    });

    if (!existing) {
      throw new Error("Quotation not found");
    }

    if (["APPROVED", "ACCEPTED", "CANCELLED"].includes(existing.status) && !data.status) {
      throw new Error(`Cannot update quotation in ${existing.status} status.`);
    }

    let pricing = {};
    if (data.items) {
      // Re-calculate pricing if items are provided
      pricing = calculatePricing(data.items);
      // Delete old items
      await tx.quotationItem.deleteMany({
        where: { quotationId }
      });
    }

    const updated = await tx.quotation.update({
      where: { id: quotationId },
      data: {
        title: data.title !== undefined ? data.title : existing.title,
        customerId: data.customerId || existing.customerId,
        contactId: data.contactId !== undefined ? data.contactId : existing.contactId,
        dealId: data.dealId !== undefined ? data.dealId : existing.dealId,
        assignedToId: data.assignedToId !== undefined ? data.assignedToId : existing.assignedToId,
        status: data.status || existing.status,
        subtotal: pricing.subtotal !== undefined ? pricing.subtotal : existing.subtotal,
        tax: pricing.tax !== undefined ? pricing.tax : existing.tax,
        discount: pricing.discount !== undefined ? pricing.discount : existing.discount,
        totalAmount: pricing.totalAmount !== undefined ? pricing.totalAmount : existing.totalAmount,
        currency: data.currency || existing.currency,
        termsConditions: data.termsConditions !== undefined ? data.termsConditions : existing.termsConditions,
        issueDate: data.issueDate ? new Date(data.issueDate) : existing.issueDate,
        expiryDate: data.expiryDate !== undefined ? (data.expiryDate ? new Date(data.expiryDate) : null) : existing.expiryDate,
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
      action: "QUOTATION_UPDATED",
      entityType: "Quotation",
      entityId: updated.id,
      details: { quoteNumber: updated.quoteNumber, changes: Object.keys(data) }
    });

    return updated;
  });
};

const getQuotationById = async (businessId, quotationId) => {
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, businessId, isDeleted: false },
    include: {
      items: true,
      customer: true,
      contact: true,
      deal: true,
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

  if (!quotation) {
    throw new Error("Quotation not found");
  }

  return quotation;
};

const deleteQuotation = async (businessId, userId, userEmail, quotationId) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.quotation.findFirst({
      where: { id: quotationId, businessId, isDeleted: false }
    });

    if (!existing) {
      throw new Error("Quotation not found");
    }

    await tx.quotation.update({
      where: { id: quotationId },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "QUOTATION_DELETED",
      entityType: "Quotation",
      entityId: quotationId,
      details: { quoteNumber: existing.quoteNumber }
    });

    return true;
  });
};

const changeStatus = async (businessId, userId, userEmail, quotationId, status) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.quotation.findFirst({
      where: { id: quotationId, businessId, isDeleted: false }
    });

    if (!existing) {
      throw new Error("Quotation not found");
    }

    const updated = await tx.quotation.update({
      where: { id: quotationId },
      data: { status }
    });

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "QUOTATION_STATUS_CHANGED",
      entityType: "Quotation",
      entityId: quotationId,
      details: { oldStatus: existing.status, newStatus: status, quoteNumber: existing.quoteNumber }
    });

    await triggerNotification(tx, {
      businessId,
      title: "Quotation Status Updated",
      message: `Quotation ${existing.quoteNumber} status changed to ${status}.`,
      type: status === "APPROVED" || status === "ACCEPTED" ? "SUCCESS" : "INFO",
      entityType: "Quotation",
      entityId: quotationId
    });

    return updated;
  });
};

module.exports = {
  createQuotation,
  updateQuotation,
  getQuotationById,
  deleteQuotation,
  changeStatus,
  generateDocNumber,
  calculatePricing
};
