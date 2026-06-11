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
      select: {
        pdfUrl: true,
        creditNumber: true,
      },
    });

    if (!credit || !credit.pdfUrl) {
      return errorResponse(res, "PDF not found", 404);
    }

    const downloadUrl = credit.pdfUrl.replace(
      "/upload/",
      "/upload/fl_attachment/"
    );

    return res.redirect(downloadUrl);
  } catch (error) {
    console.error("Download Credit Note Error:", error);
    return errorResponse(res, "Download failed", 500);
  }
};