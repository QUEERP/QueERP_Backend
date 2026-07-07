const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

const settingsService = require("../services/SettingsService");

//////////////////////////////////////////////////////
// GET BUSINESS SETTINGS
//////////////////////////////////////////////////////
exports.getSettings = async (req, res) => {
  try {
    const businessId = req.business.id;
    const data = await settingsService.getSettings(businessId);

    return successResponse(
      res,
      data.settings,
      "Settings fetched successfully"
    );

  } catch (error) {
    console.error("getSettings error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// CREATE OR UPDATE SETTINGS
//////////////////////////////////////////////////////
exports.saveSettings = async (req, res) => {
  try {
    const businessId = req.business.id;
    const data = { ...req.body };
    const files = req.files || {};

    const updatedSettings = await settingsService.saveSettings(businessId, data, files);

    // 🔥 AUTO-SYNC INVOICES IN BACKGROUND
    try {
      const { bulkUpdateInvoices } = require("./invoiceController");
      const mockReq = { business: { id: businessId } };
      const mockRes = { json: () => {}, status: () => ({ json: () => {} }) };
      bulkUpdateInvoices(mockReq, mockRes).catch(err => console.error("Background auto-sync failed:", err));
    } catch (e) {
      console.error("Could not trigger auto-sync:", e);
    }

    return successResponse(
      res,
      updatedSettings,
      "Settings saved and invoices syncing in background"
    );

  } catch (error) {
    console.error("saveSettings error:", error);
    return errorResponse(res, error.message, 500);
  }
};