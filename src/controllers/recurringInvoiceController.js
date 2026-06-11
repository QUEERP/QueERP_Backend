const recurringService = require("../services/sales/recurring.service");
const { createRecurringInvoiceSchema } = require("../validations/sales.validation");
const { successResponse, errorResponse } = require("../utils/response");
const prisma = require("../config/prisma");

exports.createProfile = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;

    const validatedData = createRecurringInvoiceSchema.parse(req.body);

    const recurring = await recurringService.createRecurringInvoice(businessId, userId, userEmail, validatedData);

    return successResponse(res, recurring, "Recurring Invoice Profile created successfully", 201);
  } catch (error) {
    console.error("createProfile controller error:", error);
    if (error.name === "ZodError") {
      return errorResponse(res, error.errors[0].message, 400, error.errors);
    }
    return errorResponse(res, error.message, 400);
  }
};

exports.getProfiles = async (req, res) => {
  try {
    const businessId = req.business.id;

    const profiles = await prisma.recurringInvoice.findMany({
      where: { businessId },
      include: {
        customer: { select: { id: true, company: true } },
        items: true
      },
      orderBy: { createdAt: "desc" }
    });

    return successResponse(res, profiles, "Recurring profiles fetched successfully");
  } catch (error) {
    console.error("getProfiles controller error:", error);
    return errorResponse(res, error.message, 500);
  }
};

exports.triggerBillingJob = async (req, res) => {
  try {
    const logs = await recurringService.processRecurringInvoices();
    return successResponse(res, logs, "Recurring billing processing completed successfully");
  } catch (error) {
    console.error("triggerBillingJob controller error:", error);
    return errorResponse(res, error.message, 500);
  }
};
