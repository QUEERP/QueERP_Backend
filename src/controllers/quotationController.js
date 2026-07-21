const quotationService = require("../services/sales/quotation.service");
const { createQuotationSchema, updateQuotationSchema } = require("../validations/sales.validation");
const { successResponse, errorResponse } = require("../utils/response");

exports.createQuotation = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;

    // Validate body payload using Zod
    const validatedData = createQuotationSchema.parse(req.body);

    const quotation = await quotationService.createQuotation(businessId, userId, userEmail, validatedData);

    return successResponse(res, quotation, "Quotation drafted successfully", 201);
  } catch (error) {
    console.error("createQuotation controller error:", error);
    if (error.name === "ZodError") {
      return errorResponse(res, error.errors[0].message, 400, error.errors);
    }
    return errorResponse(res, error.message, 500);
  }
};

exports.getQuotations = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { customerId, status } = req.query;

    const prisma = require("../config/prisma");
    const quotations = await prisma.quotation.findMany({
      where: {
        businessId,
        isDeleted: false,
        customerId: customerId || undefined,
        status: status || undefined
      },
      include: {
        customer: {
          select: { id: true, company: true }
        },
        items: true
      },
      orderBy: { createdAt: "desc" }
    });

    return successResponse(res, quotations, "Quotations fetched successfully");
  } catch (error) {
    console.error("getQuotations controller error:", error);
    return errorResponse(res, error.message, 500);
  }
};

exports.getQuotationById = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const quotation = await quotationService.getQuotationById(businessId, id);

    return successResponse(res, quotation, "Quotation retrieved successfully");
  } catch (error) {
    console.error("getQuotationById controller error:", error);
    return errorResponse(res, error.message, 404);
  }
};

exports.updateQuotation = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { id } = req.params;

    // Validate body payload using Zod
    const validatedData = updateQuotationSchema.parse(req.body);

    const quotation = await quotationService.updateQuotation(businessId, userId, userEmail, id, validatedData);

    return successResponse(res, quotation, "Quotation updated successfully");
  } catch (error) {
    console.error("updateQuotation controller error:", error);
    if (error.name === "ZodError") {
      return errorResponse(res, error.errors[0].message, 400, error.errors);
    }
    return errorResponse(res, error.message, 400);
  }
};

exports.deleteQuotation = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { id } = req.params;

    await quotationService.deleteQuotation(businessId, userId, userEmail, id);

    return successResponse(res, null, "Quotation deleted successfully");
  } catch (error) {
    console.error("deleteQuotation controller error:", error);
    return errorResponse(res, error.message, 400);
  }
};

exports.approveQuotation = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { id } = req.params;

    const quotation = await quotationService.changeStatus(businessId, userId, userEmail, id, "APPROVED");

    return successResponse(res, quotation, "Quotation approved successfully");
  } catch (error) {
    console.error("approveQuotation controller error:", error);
    return errorResponse(res, error.message, 400);
  }
};

exports.rejectQuotation = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { id } = req.params;

    const quotation = await quotationService.changeStatus(businessId, userId, userEmail, id, "REJECTED");

    return successResponse(res, quotation, "Quotation rejected successfully");
  } catch (error) {
    console.error("rejectQuotation controller error:", error);
    return errorResponse(res, error.message, 400);
  }
};

//////////////////////////////////////////////////////
// DOWNLOAD PDF
//////////////////////////////////////////////////////
exports.downloadQuotationPdf = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const prisma = require("../config/prisma");
    const quotation = await prisma.quotation.findFirst({
      where: { id, businessId },
      include: { customer: true, items: true }
    });

    if (!quotation) {
      return res.status(404).json({ success: false, message: "Quotation not found" });
    }

    const generateQuotationPdf = require("../utils/generateQuotationPdf");
    
    const settings = await prisma.settings.findUnique({
      where: { businessId: req.business.id }
    });
    
    const pdfSettings = settings || { companyName: "Your Company", signatureUrl: null };
    const pdfBuffer = await generateQuotationPdf(quotation, pdfSettings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Quotation_${quotation.quoteNumber || id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    return res.end(pdfBuffer);
  } catch (err) {
    console.error("downloadQuotationPdf controller error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};