const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");
const paymentService = require("../services/sales/payment.service");
const { createPaymentSchema } = require("../validations/sales.validation");

const createCreditNote = require("../utils/createCreditNote");
const generateCreditNumber = require("../utils/generateCreditNumber");

const generatePaymentPdf = require("../utils/generatePaymentPdf"); // invoice
const generateBillPaymentPdf = require("../utils/generateBillPaymentPdf"); // bill
const uploadPaymentPdf = require("../utils/uploadPaymentPdf");

//////////////////////////////////////////////////////
// CREATE PAYMENT (INVOICE + BILL)
//////////////////////////////////////////////////////
exports.createPayment = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;

    const { invoiceId, billId } = req.params;

    //////////////////////////////////////////////////////
    // 🔥 BILL PAYMENT (PRESERVED LOGIC)
    //////////////////////////////////////////////////////
    if (billId) {
      const { amount, paymentDate, paymentMode, transactionId, note } = req.body;

      const bill = await prisma.bill.findFirst({
        where: { id: billId, businessId },
        include: { payments: true, vendor: true },
      });

      if (!bill) {
        return errorResponse(res, "Bill not found", 404);
      }

      if (bill.status === "PAID") {
        return errorResponse(res, "Bill is already paid", 400);
      }

      const previousPaid = bill.payments.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
      );

      const currentAmount = Number(amount || 0);
      const totalPaid = previousPaid + currentAmount;
      const billTotal = Number(bill.totalAmount || 0);

      // Payment Number Generation
      const lastPayment = await prisma.payment.findFirst({
        where: { businessId },
        orderBy: { paymentNumber: "desc" },
        select: { paymentNumber: true },
      });

      let paymentNumber = "P-001";
      if (lastPayment?.paymentNumber) {
        const lastNumber = parseInt(lastPayment.paymentNumber.split("-")[1]);
        paymentNumber = `P-${String(lastNumber + 1).padStart(3, "0")}`;
      }

      let payment = await prisma.payment.create({
        data: {
          paymentNumber,
          billId,
          businessId,
          amount: currentAmount,
          paymentDate: new Date(paymentDate),
          paymentMode,
          transactionId,
          note,
          createdBy: userId,
        },
      });

      // Generate Bill Payment PDF
      const settings = await prisma.settings.findUnique({
        where: { businessId },
      });

      try {
        const pdfBuffer = await generateBillPaymentPdf(payment, bill, settings);
        const pdfUrl = await uploadPaymentPdf(pdfBuffer, payment.id);
        payment = await prisma.payment.update({
          where: { id: payment.id },
          data: { pdfUrl },
        });
      } catch (pdfError) {
        console.error("Bill PDF generation failed:", pdfError);
      }

      // Credit Note for overpayment
      let creditNote = null;
      if (totalPaid > billTotal) {
        const extraAmount = totalPaid - billTotal;
        const creditNumber = await generateCreditNumber(businessId, "BILL");
        creditNote = await prisma.creditNote.create({
          data: {
            business: { connect: { id: businessId } },
            vendor: { connect: { id: bill.vendorId } },
            creditNumber,
            type: "BILL",
            amount: extraAmount,
            remainingAmount: extraAmount,
            reason: "Overpayment from bill",
            status: "OPEN",
          },
        });
      }

      // Update Bill status
      let status = "UNPAID";
      if (totalPaid === 0) {
        status = "UNPAID";
      } else if (totalPaid < billTotal) {
        status = "PARTIALLY_PAID";
      } else {
        status = "PAID";
      }

      await prisma.bill.update({
        where: { id: billId },
        data: { status },
      });

      return successResponse(
        res,
        {
          payment,
          remaining: Math.max(billTotal - totalPaid, 0),
          creditNote,
        },
        "Bill payment recorded successfully"
      );
    }

    //////////////////////////////////////////////////////
    // 🔥 INVOICE PAYMENT (UPGRADED TO SERVICE LAYER)
    //////////////////////////////////////////////////////
    if (invoiceId) {
      // Validate payment payload using Zod
      const validatedData = createPaymentSchema.parse(req.body);

      const result = await paymentService.createPayment(businessId, userId, userEmail, invoiceId, validatedData);

      // Generate PDF
      try {
        const updatedInvoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            grandTotal: true,
            customer: true,
            payments: true,
          },
        });

        const settings = await prisma.settings.findUnique({
          where: { businessId },
        });

        const pdfBuffer2 = await generatePaymentPdf(
          result.payment,
          updatedInvoice,
          settings
        );

        if (pdfBuffer2) {
          const pdfUrl2 = await uploadPaymentPdf(pdfBuffer2, result.payment.id);
          result.payment = await prisma.payment.update({
            where: { id: result.payment.id },
            data: { pdfUrl: pdfUrl2 },
          });
        }
      } catch (pdfError) {
        console.error("Invoice Payment PDF generation failed:", pdfError);
      }

      return successResponse(
        res,
        result,
        "Invoice payment recorded successfully"
      );
    }

    return errorResponse(res, "Missing invoiceId or billId parameter", 400);

  } catch (error) {
    console.error("createPayment controller error:", error);
    if (error.name === "ZodError") {
      return errorResponse(res, error.errors[0].message, 400, error.errors);
    }
    return errorResponse(res, error.message, 500);
  }
};

//////////////////////////////////////////////////////
// GET PAYMENTS BY INVOICE
//////////////////////////////////////////////////////
exports.getInvoicePayments = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { invoiceId } = req.params;

    const payments = await paymentService.getPaymentsByInvoiceId(businessId, invoiceId);

    return successResponse(res, payments, "Invoice payments retrieved successfully");
  } catch (err) {
    console.error("getInvoicePayments controller error:", err);
    return errorResponse(res, err.message, 500);
  }
};

//////////////////////////////////////////////////////
// GET PAYMENTS BY BILL (PRESERVED)
//////////////////////////////////////////////////////
exports.getBillPayments = async (req, res) => {
  try {
    const { billId } = req.params;

    const payments = await prisma.payment.findMany({
      where: { billId, businessId: req.business.id },
      orderBy: { createdAt: "desc" },
      include: {
        bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            vendor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return successResponse(res, payments, "Bill payments retrieved successfully");
  } catch (err) {
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// GET ALL PAYMENTS (PRESERVED)
//////////////////////////////////////////////////////
exports.getPayments = async (req, res) => {
  try {
    const businessId = req.business.id;

    const payments = await prisma.payment.findMany({
      where: { businessId },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            vendor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(res, payments, "All payments retrieved successfully");
  } catch (error) {
    return errorResponse(res, "Failed to fetch payments", 500);
  }
};

//////////////////////////////////////////////////////
// DOWNLOAD PAYMENT PDF
//////////////////////////////////////////////////////
exports.downloadPaymentPdf = async (req, res) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: {
        id: req.params.paymentId || req.params.id,
        businessId: req.business.id,
      },
    });

    if (!payment?.pdfUrl) {
      return res.status(404).json({
        success: false,
        message: "PDF not found",
      });
    }

    const downloadUrl = payment.pdfUrl.replace(
      "/upload/",
      "/upload/fl_attachment/"
    );

    return res.redirect(downloadUrl);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};