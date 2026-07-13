const prisma = require("../config/prisma");
const complianceEngine = require("./compliance/ComplianceEngine");

class SettingsService {
  async getSettings(businessId) {
    const settings = await prisma.settings.findUnique({
      where: { businessId },
    });

    if (settings) {
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

    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });

    return { settings, business };
  }

  async saveSettings(businessId, data, files = {}) {
    // 1. Separate fields into Business and Settings
    // NOTE: 'country' is IMMUTABLE — it is excluded from updates to enforce Source of Truth policy
    const businessFields = [
      'state', 'city', 'currency', 'gstNumber', 'vatNumber',
      'financialYearStart', 'financialYearEnd', 'legalName', 'businessType',
      'industry', 'description', 'pinCode', 'timeZone', 'language', 'emirate',
      'pan', 'tan', 'msmeNumber', 'gstRegistrationType', 'vatRegistrationDate',
      'vatRegistrationType'
    ];

    const businessUpdateData = {};
    const settingsUpdateData = {};

    for (const key of Object.keys(data)) {
      if (key === 'country') continue; // IMMUTABLE — never allow country updates
      if (businessFields.includes(key)) {
        if (key === 'financialYearStart' || key === 'financialYearEnd' || key === 'vatRegistrationDate') {
          businessUpdateData[key] = data[key] ? new Date(data[key]) : null;
        } else {
          businessUpdateData[key] = data[key];
        }
      } else {
        settingsUpdateData[key] = data[key];
      }
    }

    // 2. Handle specific settings logic (Currency, Leaves, Uploads, Overtime)
    if (settingsUpdateData.currency || businessUpdateData.currency) {
      const currency = settingsUpdateData.currency || businessUpdateData.currency;
      const currencyMap = {
        INR: "₹", USD: "$", AED: "AED", EUR: "€", GBP: "£",
        CAD: "C$", AUD: "A$", JPY: "¥", CNY: "¥", SAR: "SR", QAR: "QR",
      };
      settingsUpdateData.currency = currency;
      settingsUpdateData.currencySymbol = currencyMap[currency] || currency;
      businessUpdateData.currency = currency; // keep in sync
    }

    if (files.companyLogo) {
      settingsUpdateData.companyLogo = files.companyLogo[0].path;
    }
    if (files.signature) {
      settingsUpdateData.signatureUrl = files.signature[0].path;
    }

    if (settingsUpdateData.leaveTypes !== undefined) {
      let leaveTypes = settingsUpdateData.leaveTypes || [];
      if (typeof leaveTypes === "string") leaveTypes = JSON.parse(leaveTypes);
      leaveTypes = leaveTypes.filter(l => l.code !== "LWP");
      leaveTypes.push({ code: "LWP", name: "Unpaid Leave", yearlyLimit: null, system: true });
      settingsUpdateData.leaveTypes = leaveTypes;
    }

    if (settingsUpdateData.overtimeThreshold !== undefined) {
      settingsUpdateData.overtimeThreshold = parseFloat(settingsUpdateData.overtimeThreshold) || 0;
    }

    if (settingsUpdateData.defaultTaxSettings) {
      if (typeof settingsUpdateData.defaultTaxSettings === 'string') {
        settingsUpdateData.defaultTaxSettings = JSON.parse(settingsUpdateData.defaultTaxSettings);
      }
    }
    
    // Parse boolean fields
    const boolFields = ['negativeStock', 'barcodeTracking', 'batchTracking', 'serialTracking', 'reverseCharge'];
    for (const field of boolFields) {
      if (settingsUpdateData[field] !== undefined) {
        settingsUpdateData[field] = settingsUpdateData[field] === 'true' || settingsUpdateData[field] === true;
      }
    }

    // 3. Update Database (Transaction to ensure atomicity)
    const result = await prisma.$transaction(async (tx) => {
      let updatedBusiness = null;
      if (Object.keys(businessUpdateData).length > 0) {
        updatedBusiness = await tx.business.update({
          where: { id: businessId },
          data: businessUpdateData
        });
      }

      const updatedSettings = await tx.settings.upsert({
        where: { businessId },
        update: settingsUpdateData,
        create: { ...settingsUpdateData, businessId, companyName: businessUpdateData.legalName || 'New Business' },
      });

      return { updatedSettings, updatedBusiness };
    });

    // 4. Trigger Compliance Re-Evaluation in Background
    const currentBusiness = await prisma.business.findUnique({ where: { id: businessId } });
    if (currentBusiness) {
      // Evaluate the business record itself for missing fields
      complianceEngine.evaluateRecord(businessId, 'Business', businessId, currentBusiness).catch(e => console.error(e));
    }

    return result.updatedSettings;
  }
}

module.exports = new SettingsService();
