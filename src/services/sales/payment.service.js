const prisma = require("../../config/prisma");
const { logAction, triggerNotification } = require("./audit.service");
const { generateDocNumber } = require("./quotation.service");

const createPayment = async (businessId, userId, userEmail, invoiceId, data) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch Invoice
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, businessId, isDeleted: false },
      include: { payments: true }
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status === "PAID") {
      throw new Error("Invoice is already fully paid.");
    }

    // 2. Calculate remaining dues
    const previousPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const remaining = Math.max(Number(invoice.grandTotal || 0) - previousPaid, 0);

    const paymentAmount = Number(data.amount || 0);
    const totalPaid = previousPaid + paymentAmount;
    const overpaidAmount = Math.max(paymentAmount - remaining, 0);

    // 3. Generate unique payment number
    const paymentNumber = await generateDocNumber(tx, businessId, "PAY", "payment", "paymentNumber");

    // 4. Create Payment Record
    const payment = await tx.payment.create({
      data: {
        paymentNumber,
        invoiceId,
        businessId,
        amount: paymentAmount,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        paymentMode: data.paymentMode || "CASH",
        transactionId: data.transactionId || null,
        note: data.note || null,
        createdBy: userId
      }
    });

    // 5. If overpaid, create a Credit Note automatically
    let creditNote = null;
    if (overpaidAmount > 0) {
      const creditNumber = await generateDocNumber(tx, businessId, "CN", "creditNote", "creditNumber");
      creditNote = await tx.creditNote.create({
        data: {
          businessId,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          creditNumber,
          type: "INVOICE",
          amount: overpaidAmount,
          remainingAmount: overpaidAmount,
          reason: `Overpayment for invoice ${invoice.invoiceNumber}`,
          status: "OPEN"
        }
      });
    }

    // 6. Update Invoice Status
    let status = "UNPAID";
    if (totalPaid === 0) {
      status = "UNPAID";
    } else if (totalPaid < Number(invoice.grandTotal || 0)) {
      status = "PARTIALLY_PAID";
    } else {
      status = "PAID";
    }

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status }
    });

    // 7. Log Audit & Trigger System Alert
    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "PAYMENT_RECORDED",
      entityType: "Payment",
      entityId: payment.id,
      details: { paymentNumber, amount: paymentAmount, invoiceNumber: invoice.invoiceNumber, overpaidAmount }
    });

    await triggerNotification(tx, {
      businessId,
      title: "Payment Recorded",
      message: `Payment ${paymentNumber} of amount ${paymentAmount} received for invoice ${invoice.invoiceNumber}.`,
      type: "SUCCESS",
      entityType: "Payment",
      entityId: payment.id
    });

    return { payment, creditNote };
  });
};

const getPaymentsByInvoiceId = async (businessId, invoiceId) => {
  return await prisma.payment.findMany({
    where: { invoiceId, businessId },
    orderBy: { createdAt: "desc" }
  });
};

module.exports = {
  createPayment,
  getPaymentsByInvoiceId
};
