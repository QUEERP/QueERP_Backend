const prisma = require("../../config/prisma");
const { logAction, triggerNotification } = require("./audit.service");
const { generateDocNumber } = require("./quotation.service");

const createSalesReturn = async (businessId, userId, userEmail, data) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Generate unique return number
    const returnNumber = await generateDocNumber(tx, businessId, "SR", "salesReturn", "returnNumber");

    // 2. Compute pricing of returned items
    let subtotal = 0;
    let totalTax = 0;
    const processedItems = data.items.map((item) => {
      const qty = Number(item.quantity || 0);
      const prc = Number(item.price || 0);
      const taxRate = Number(item.taxPercent || 0);

      const baseAmount = qty * prc;
      const tax = baseAmount * (taxRate / 100);
      const total = baseAmount + tax;

      subtotal += baseAmount;
      totalTax += tax;

      return {
        productId: item.productId,
        description: item.description,
        quantity: qty,
        price: prc,
        taxPercent: taxRate,
        total,
        warehouseId: item.warehouseId || null,
        isStockReturned: item.isStockReturned || false
      };
    });

    const totalAmount = subtotal + totalTax;

    // 3. Create Sales Return
    const salesReturn = await tx.salesReturn.create({
      data: {
        businessId,
        customerId: data.customerId,
        invoiceId: data.invoiceId || null,
        salesOrderId: data.salesOrderId || null,
        returnNumber,
        status: "RECEIVED",
        reason: data.reason || null,
        refundStatus: "CREDIT_NOTE_ISSUED",
        subtotal,
        tax: totalTax,
        totalAmount,
        items: {
          create: processedItems
        }
      },
      include: {
        items: true,
        customer: true
      }
    });

    // 4. Return Stock to physical warehouse inventory if designated as returned
    for (const item of processedItems) {
      if (item.productId && item.warehouseId && item.isStockReturned) {
        const stockRecord = await tx.stock.findFirst({
          where: {
            productId: item.productId,
            warehouseId: item.warehouseId
          }
        });

        if (stockRecord) {
          await tx.stock.update({
            where: { id: stockRecord.id },
            data: {
              quantity: {
                increment: item.quantity
              }
            }
          });
        } else {
          // Create stock record inside that warehouse if not exists
          await tx.stock.create({
            data: {
              productId: item.productId,
              warehouseId: item.warehouseId,
              quantity: item.quantity,
              reservedQty: 0
            }
          });
        }
      }
    }

    // 5. Automatically issue Credit Note for returned amount
    const creditNumber = await generateDocNumber(tx, businessId, "CN", "creditNote", "creditNumber");
    const creditNote = await tx.creditNote.create({
      data: {
        businessId,
        customerId: data.customerId,
        invoiceId: data.invoiceId || null,
        salesReturnId: salesReturn.id,
        creditNumber,
        type: "INVOICE",
        amount: totalAmount,
        remainingAmount: totalAmount,
        reason: `Sales return ${returnNumber} credit adjustment`,
        status: "OPEN"
      }
    });

    // 6. Log Audit Trail & Notification
    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "SALES_RETURN_CREATED",
      entityType: "SalesReturn",
      entityId: salesReturn.id,
      details: { returnNumber, totalAmount, creditNoteNumber: creditNumber }
    });

    await triggerNotification(tx, {
      businessId,
      title: "Sales Return Logged",
      message: `Return ${returnNumber} accepted. Stock returned. Credit Note ${creditNumber} issued.`,
      type: "SUCCESS",
      entityType: "SalesReturn",
      entityId: salesReturn.id
    });

    return { salesReturn, creditNote };
  });
};

const getSalesReturnsByBusiness = async (businessId) => {
  return await prisma.salesReturn.findMany({
    where: { businessId },
    include: {
      items: true,
      customer: true,
      invoice: true,
      creditNotes: true
    },
    orderBy: { createdAt: "desc" }
  });
};

const getSalesReturnById = async (businessId, id) => {
  const sr = await prisma.salesReturn.findFirst({
    where: { id, businessId },
    include: {
      items: true,
      customer: true,
      invoice: true,
      creditNotes: true
    }
  });
  if (!sr) {
    throw new Error("Sales Return not found");
  }
  return sr;
};

module.exports = {
  createSalesReturn,
  getSalesReturnsByBusiness,
  getSalesReturnById
};
