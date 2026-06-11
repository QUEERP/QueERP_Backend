const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// GET BUSINESS SETTINGS
//////////////////////////////////////////////////////
exports.getSettings = async (req, res) => {
  try {
    const businessId = req.business.id;

    const settings = await prisma.settings.findUnique({
      where: { businessId },
    });

    if (settings) {
      // Ensure LWP is always in the response
      let leaveTypes = settings.leaveTypes || [];
      if (typeof leaveTypes === "string") leaveTypes = JSON.parse(leaveTypes);
      
      const hasLwp = leaveTypes.some(l => l.code === "LWP");
      if (!hasLwp) {
        leaveTypes.push({
          code: "LWP",
          name: "Unpaid Leave",
          yearlyLimit: null,
          system: true
        });
        settings.leaveTypes = leaveTypes;
      }
    }

    return successResponse(
      res,
      settings,
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

    // 🔥 SUPPORT ALL GLOBAL CURRENCIES
    const currencyMap = {
      INR: "₹",
      USD: "$",
      AED: "AED",
      EUR: "€",
      GBP: "£",
      CAD: "C$",
      AUD: "A$",
      JPY: "¥",
      CNY: "¥",
      SAR: "SR",
      QAR: "QR",
    };

    // Auto assign symbol or use the code itself if unknown
    if (data.currency && !data.currencySymbol) {
      data.currencySymbol = currencyMap[data.currency] || data.currency;
    }

    // Default to AED if nothing sent
    if (!data.currency) {
      data.currency = "AED";
    }

    if (!data.currencySymbol) {
      data.currencySymbol = currencyMap[data.currency] || data.currency;
    }

    //////////////////////////////////////////////////////
    // LOGO UPLOAD
    //////////////////////////////////////////////////////
    if (req.files?.companyLogo) {
      data.companyLogo = req.files.companyLogo[0].path;
    }

    //////////////////////////////////////////////////////
    // SIGNATURE UPLOAD
    //////////////////////////////////////////////////////
    if (req.files?.signature) {
      data.signatureUrl = req.files.signature[0].path;
    }

    //////////////////////////////////////////////////////
// HANDLE LEAVE TYPES
//////////////////////////////////////////////////////

    let leaveTypes = data.leaveTypes || [];

    if (typeof leaveTypes === "string") {
      leaveTypes = JSON.parse(leaveTypes);
    }

    // remove existing LWP
    leaveTypes = leaveTypes.filter(l => l.code !== "LWP");

    // add protected LWP
    leaveTypes.push({
      code: "LWP",
      name: "Unpaid Leave",
      yearlyLimit: null,
      system: true
    });

    data.leaveTypes = leaveTypes;

    // Ensure LWP exists
    const lwpExists = leaveTypes.some(l => l.code === "LWP");

    if (!lwpExists) {
      leaveTypes.push({
        code: "LWP",
        name: "Unpaid Leave",
        yearlyLimit: null,
        system: true
      });
    }

    // Prevent deletion
    leaveTypes = leaveTypes.map(l => {
      if (l.code === "LWP") {
        return {
          code: "LWP",
          name: "Unpaid Leave",
          yearlyLimit: null,
          system: true
        };
      }
      return l;
    });

    data.leaveTypes = leaveTypes;

    // 🔥 Fix: Ensure overtimeThreshold is a number (Float in Prisma)
    if (data.overtimeThreshold !== undefined) {
      data.overtimeThreshold = parseFloat(data.overtimeThreshold) || 0;
    }

    //////////////////////////////////////////////////////
    // CHECK EXISTING SETTINGS
    //////////////////////////////////////////////////////
    const existingSettings = await prisma.settings.findUnique({
      where: { businessId },
    });

    // Use upsert to handle both create and update
    const updatedSettings = await prisma.settings.upsert({
      where: { businessId },
      update: data,
      create: { ...data, businessId },
    });

    // 🔥 AUTO-SYNC INVOICES IN BACKGROUND
    // We don't 'await' this so the user doesn't have to wait for the response
    try {
      const { bulkUpdateInvoices } = require("./invoiceController");
      // Create mock req/res for the controller function
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