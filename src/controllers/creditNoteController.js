const creditNoteService = require("../services/sales/creditNote.service");
const { successResponse, errorResponse } = require("../utils/response");
const prisma = require("../config/prisma");

exports.createCreditNote = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;

    // Direct creation of manual credit notes
    const data = req.body;
    if (!data.amount || data.amount <= 0) {
      return errorResponse(res, "Amount must be greater than 0", 400);
    }

    const cn = await creditNoteService.createCreditNote(businessId, userId, userEmail, data);

    return successResponse(res, cn, "Credit Note created successfully", 201);
  } catch (error) {
    console.error("createCreditNote controller error:", error);
    return errorResponse(res, error.message, 400);
  }
};

exports.getAllCreditNotes = async (req, res) => {
  try {
    const businessId = req.business.id;
    const credits = await creditNoteService.getCreditNotesByBusiness(businessId);

    const protocol = process.env.NODE_ENV === "production" ? "https" : req.protocol;
    const baseUrl = `${protocol}://${req.get("host")}`;

    const formatted = credits.map((credit) => ({
      id: credit.id,
      creditNumber: credit.creditNumber,
      amount: credit.amount,
      remainingAmount: credit.remainingAmount,
      status: credit.status,
      pdfUrl: credit.pdfUrl || null,
      createdAt: credit.createdAt,
      customer: credit.customer,
      invoice: credit.invoice,
      salesReturn: credit.salesReturn,
      downloadUrl: credit.pdfUrl
        ? `${baseUrl}/api/credit-notes/${credit.id}/download`
        : null,
    }));

    return successResponse(res, formatted, "Credit Notes fetched successfully");
  } catch (error) {
    console.error("Get All Credit Notes Error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

exports.getCreditNote = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const credit = await creditNoteService.getCreditNoteById(businessId, id);

    const protocol = process.env.NODE_ENV === "production" ? "https" : req.protocol;
    const baseUrl = `${protocol}://${req.get("host")}`;

    return successResponse(res, {
      ...credit,
      downloadUrl: credit.pdfUrl
        ? `${baseUrl}/api/credit-notes/${credit.id}/download`
        : null,
    }, "Credit Note retrieved successfully");
  } catch (error) {
    console.error("Get Credit Note Error:", error);
    return errorResponse(res, error.message, 404);
  }
};

exports.deleteCreditNote = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { id } = req.params;

    await creditNoteService.deleteCreditNote(businessId, userId, userEmail, id);

    return successResponse(res, null, "Credit Note voided successfully");
  } catch (error) {
    console.error("Delete Credit Note Error:", error);
    return errorResponse(res, error.message, 400);
  }
};

exports.downloadCreditNotePdf = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const credit = await prisma.creditNote.findFirst({
      where: { id, businessId },
      include: {
        customer: true,
        vendor: true,
      }
    });

    if (!credit) {
      return errorResponse(res, "Credit Note not found", 404);
    }

    const settings = await prisma.settings.findUnique({
      where: { businessId }
    });

    const generateCreditNotePdf = require("../utils/generateCreditNotePdf");
    const pdfBuffer = await generateCreditNotePdf(credit, settings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="CreditNote_${credit.creditNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    return res.end(pdfBuffer);
  } catch (error) {
    console.error("Download Credit Note proxy error:", error);
    return res.status(500).json({ success: false, message: "Download failed" });
  }
};