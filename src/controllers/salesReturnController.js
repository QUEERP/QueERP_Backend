const salesReturnService = require("../services/sales/salesReturn.service");
const { createSalesReturnSchema } = require("../validations/sales.validation");
const { successResponse, errorResponse } = require("../utils/response");

exports.createSalesReturn = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;

    const validatedData = createSalesReturnSchema.parse(req.body);

    const result = await salesReturnService.createSalesReturn(businessId, userId, userEmail, validatedData);

    return successResponse(res, result, "Sales Return logged and Credit Note issued successfully", 201);
  } catch (error) {
    console.error("createSalesReturn controller error:", error);
    if (error.name === "ZodError") {
      return errorResponse(res, error.errors[0].message, 400, error.errors);
    }
    return errorResponse(res, error.message, 400);
  }
};

exports.getSalesReturns = async (req, res) => {
  try {
    const businessId = req.business.id;

    const returns = await salesReturnService.getSalesReturnsByBusiness(businessId);

    return successResponse(res, returns, "Sales Returns fetched successfully");
  } catch (error) {
    console.error("getSalesReturns controller error:", error);
    return errorResponse(res, error.message, 500);
  }
};

exports.getSalesReturnById = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const returnObj = await salesReturnService.getSalesReturnById(businessId, id);

    return successResponse(res, returnObj, "Sales Return retrieved successfully");
  } catch (error) {
    console.error("getSalesReturnById controller error:", error);
    return errorResponse(res, error.message, 404);
  }
};
