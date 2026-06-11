const prisma = require("../../config/prisma");
const { logAction, triggerNotification } = require("../sales/audit.service");
const { generateDocNumber } = require("../sales/quotation.service");

const recordVendorPayment = async (businessId, userId, userEmail, billId, data) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch Bill
    const bill = await tx.bill.findFirst({
      where: { id: billId, businessId },
      include: { vendor: true }
    });

    if (!bill) {
      throw new Error("Bill not found");
    }

    if (bill.status === "PAID") {
      throw new Error("Bill is already fully paid.");
    }

    const paymentAmount = parseFloat(data.amount);
    if (paymentAmount <= 0) {
      throw new Error("Payment amount must be greater than 0.");
    }

    if (paymentAmount > bill.outstandingAmount) {
      throw new Error(`Payment amount exceeds the outstanding bill amount of ${bill.outstandingAmount}.`);
    }

    // 2. Generate Payment Number
    const paymentNumber = await generateDocNumber(tx, businessId, "VPAY", "payment", "paymentNumber");

    // 3. Create Payment Record linked to Bill
    const payment = await tx.payment.create({
      data: {
        paymentNumber,
        billId,
        businessId,
        amount: paymentAmount,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        paymentMode: data.paymentMode || "BANK_TRANSFER",
        transactionId: data.transactionId || null,
        note: data.note || null,
        createdBy: userId
      }
    });

    // 4. Update Bill outstanding amount and status
    const newOutstanding = Math.max(bill.outstandingAmount - paymentAmount, 0);
    let newStatus = "UNPAID";
    if (newOutstanding === 0) {
      newStatus = "PAID";
    } else if (newOutstanding < bill.totalAmount) {
      newStatus = "PARTIALLY_PAID";
    }

    await tx.bill.update({
      where: { id: billId },
      data: {
        outstandingAmount: newOutstanding,
        status: newStatus
      }
    });

    // 5. Decrement Vendor Liability Balance
    await tx.vendor.update({
      where: { id: bill.vendorId },
      data: {
        balance: {
          decrement: paymentAmount
        }
      }
    });

    // 6. Log Audit and Alerts
    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "VENDOR_PAYMENT_RECORDED",
      module: "PURCHASE",
      entityType: "Payment",
      entityId: payment.id,
      details: { paymentNumber, amount: paymentAmount, billNumber: bill.billNumber }
    });

    await triggerNotification(tx, {
      businessId,
      title: "Vendor Payment Recorded",
      message: `Paid ${paymentAmount} to vendor ${bill.vendor.name} for bill ${bill.billNumber}.`,
      type: "SUCCESS",
      entityType: "Payment",
      entityId: payment.id
    });

    return payment;
  });
};

const getPaymentsByBillId = async (businessId, billId) => {
  return await prisma.payment.findMany({
    where: { billId, businessId },
    orderBy: { createdAt: "desc" }
  });
};

module.exports = {
  recordVendorPayment,
  getPaymentsByBillId
};
