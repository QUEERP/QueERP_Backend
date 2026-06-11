const prisma = require("../../config/prisma");
const { logAction, triggerNotification } = require("./audit.service");
const { generateDocNumber, calculatePricing } = require("./quotation.service");
const { deductStock } = require("./invoice.service");

/**
 * Helper to advance date by frequency
 */
const calculateNextDate = (currentDate, frequency) => {
  const next = new Date(currentDate);
  if (frequency === "DAILY") {
    next.setDate(next.getDate() + 1);
  } else if (frequency === "WEEKLY") {
    next.setDate(next.getDate() + 7);
  } else if (frequency === "MONTHLY") {
    next.setMonth(next.getMonth() + 1);
  } else if (frequency === "YEARLY") {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
};

const createRecurringInvoice = async (businessId, userId, userEmail, data) => {
  return await prisma.$transaction(async (tx) => {
    const pricing = calculatePricing(data.items);

    const processedItems = pricing.processedItems.map((item) => ({
      productId: item.productId,
      description: item.description,
      itemType: item.itemType,
      quantity: item.quantity,
      price: item.price,
      taxPercent: item.taxPercent,
      taxDetails: item.taxDetails || [],
      total: item.total
    }));

    const startDate = new Date(data.startDate);
    const nextInvoiceDate = new Date(startDate);

    const recurring = await tx.recurringInvoice.create({
      data: {
        businessId,
        customerId: data.customerId,
        profileName: data.profileName,
        status: "ACTIVE",
        frequency: data.frequency || "MONTHLY",
        startDate,
        endDate: data.endDate ? new Date(data.endDate) : null,
        nextInvoiceDate,
        currency: data.currency || "INR",
        subtotal: pricing.subtotal,
        totalTax: pricing.tax,
        discount: pricing.discount,
        grandTotal: pricing.totalAmount,
        notes: data.notes || null,
        terms: data.terms || null,
        items: {
          create: processedItems
        }
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
      action: "RECURRING_INVOICE_PROFILE_CREATED",
      entityType: "RecurringInvoice",
      entityId: recurring.id,
      details: { profileName: data.profileName, frequency: data.frequency }
    });

    return recurring;
  });
};

/**
 * Core engine invoked by BullMQ / Scheduler
 */
const processRecurringInvoices = async () => {
  const now = new Date();

  // Find active profiles due to generate invoices
  const activeProfiles = await prisma.recurringInvoice.findMany({
    where: {
      status: "ACTIVE",
      nextInvoiceDate: {
        lte: now
      },
      OR: [
        { endDate: null },
        { endDate: { gte: now } }
      ]
    },
    include: {
      items: true
    }
  });

  const runLogs = [];

  for (const profile of activeProfiles) {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Generate unique invoice number
        const invoiceNumber = await generateDocNumber(tx, profile.businessId, "INV", "invoice", "invoiceNumber");

        // 2. Prepare items for invoice
        const invoiceItems = profile.items.map((item) => ({
          productId: item.productId,
          description: item.description,
          itemType: item.itemType,
          quantity: item.quantity,
          price: item.price,
          taxPercent: item.taxPercent,
          taxDetails: item.taxDetails || [],
          discount: 0,
          hours: 0,
          rate: item.price,
          amount: item.total,
          totalTax: item.total * ((item.taxPercent || 0) / (100 + (item.taxPercent || 0))),
          totalAmount: item.total
        }));

        // 3. Create Invoice
        const invoice = await tx.invoice.create({
          data: {
            businessId: profile.businessId,
            invoiceNumber,
            customerId: profile.customerId,
            status: "APPROVED",
            subtotal: profile.subtotal,
            totalTax: profile.totalTax,
            discount: profile.discount,
            grandTotal: profile.grandTotal,
            currency: profile.currency,
            terms: profile.terms,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Default 15 days
            items: {
              create: invoiceItems
            }
          }
        });

        // 4. Deduct Stock from inventory
        await deductStock(tx, profile.businessId, invoiceItems, false);

        // 5. Compute next invoice date
        const currentNextDate = new Date(profile.nextInvoiceDate);
        const nextInvoiceDate = calculateNextDate(currentNextDate, profile.frequency);

        // Update profile
        await tx.recurringInvoice.update({
          where: { id: profile.id },
          data: {
            lastInvoiceDate: currentNextDate,
            nextInvoiceDate: profile.endDate && nextInvoiceDate > new Date(profile.endDate) ? null : nextInvoiceDate,
            status: profile.endDate && nextInvoiceDate > new Date(profile.endDate) ? "COMPLETED" : "ACTIVE"
          }
        });

        // 6. Log & notify
        await logAction(tx, {
          businessId: profile.businessId,
          action: "RECURRING_INVOICE_GENERATED",
          entityType: "Invoice",
          entityId: invoice.id,
          details: { profileId: profile.id, invoiceNumber }
        });

        await triggerNotification(tx, {
          businessId: profile.businessId,
          title: "Recurring Invoice Dispatched",
          message: `Auto-generated invoice ${invoiceNumber} for profile '${profile.profileName}'.`,
          type: "SUCCESS",
          entityType: "Invoice",
          entityId: invoice.id
        });

        runLogs.push({ profileId: profile.id, invoiceNumber, success: true });
      });
    } catch (err) {
      console.error(`Error processing recurring profile ${profile.id}:`, err);
      runLogs.push({ profileId: profile.id, error: err.message, success: false });
    }
  }

  return runLogs;
};

module.exports = {
  createRecurringInvoice,
  processRecurringInvoices
};
