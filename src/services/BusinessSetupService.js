const prisma = require("../config/prisma");

class BusinessSetupService {
  async setupNewBusiness(name, country, userId) {
    const isIndia = country === 'INDIA';
    const isUAE = country === 'UAE';
    const currency = isIndia ? 'INR' : (isUAE ? 'AED' : 'USD');
    const currencySymbol = isIndia ? '₹' : (isUAE ? 'د.إ' : '$');
    const invoicePrefix = isIndia ? 'INV-IND-' : (isUAE ? 'INV-UAE-' : 'INV-');
    
    // Default Finance Accounts based on Country
    const defaultAccounts = isIndia ? [
      { name: "CGST Payable", type: "LIABILITY", code: "L-101" },
      { name: "SGST Payable", type: "LIABILITY", code: "L-102" },
      { name: "IGST Payable", type: "LIABILITY", code: "L-103" },
      { name: "Sales Revenue", type: "INCOME", code: "I-201" },
      { name: "Cost of Goods Sold", type: "EXPENSE", code: "E-301" }
    ] : (isUAE ? [
      { name: "VAT Payable", type: "LIABILITY", code: "L-101" },
      { name: "VAT Receivable", type: "ASSET", code: "A-102" },
      { name: "Sales Revenue", type: "INCOME", code: "I-201" },
      { name: "Cost of Goods Sold", type: "EXPENSE", code: "E-301" }
    ] : []);

    const business = await prisma.$transaction(async (tx) => {
      // 1. Create Business
      const newBusiness = await tx.business.create({
        data: {
          name,
          country: country || 'INDIA',
          currency,
          ownerId: userId,
          isActive: false, // Wait for subscription/admin approval if needed, though prompt says "immediately after creation"
        }
      });

      // 2. Create Subscription
      await tx.subscription.create({
        data: {
          businessId: newBusiness.id,
          status: "ACTIVE" // Assuming active to let them configure it immediately
        }
      });

      // 3. Create Settings
      await tx.settings.create({
        data: {
          businessId: newBusiness.id,
          companyName: name,
          currency,
          currencySymbol,
          invoicePrefix,
          invoiceFormat: "INV-YYYY-MM-DD-COUNT",
          defaultWarehouseId: null, // Will update below
          invoiceTemplate: isIndia ? "india_gst_modern" : "uae_vat_modern"
        }
      });

      // 4. Roles & Permissions
      const adminRole = await tx.role.create({ data: { name: "Admin", businessId: newBusiness.id } });
      await tx.role.create({ data: { name: "User", businessId: newBusiness.id } });
      
      const permissions = await tx.permission.findMany();
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map(p => ({ roleId: adminRole.id, permissionId: p.id }))
        });
      }

      await tx.businessUser.create({
        data: { userId, businessId: newBusiness.id, roleId: adminRole.id }
      });

      // 5. Default Warehouse
      const mainWarehouse = await tx.warehouse.create({
        data: {
          name: "Main Warehouse",
          code: "WH-MAIN",
          businessId: newBusiness.id,
          type: "STANDARD"
        }
      });
      await tx.settings.update({
        where: { businessId: newBusiness.id },
        data: { defaultWarehouseId: mainWarehouse.id }
      });

      // 6. Default Accounts
      if (defaultAccounts.length > 0) {
        await tx.account.createMany({
          data: defaultAccounts.map(a => ({ ...a, businessId: newBusiness.id }))
        });
      }

      // Update User Active Business
      await tx.user.update({
        where: { id: userId },
        data: { activeBusinessId: newBusiness.id }
      });

      return newBusiness;
    });

    // 7. Initialize Compliance Rules (outside transaction to avoid deadlocks with existing engine)
    const complianceEngine = require('./compliance/ComplianceEngine');
    // Note: in a real implementation, we would register country-specific rules here
    
    // Setup Country Specific Tax Configuration
    await this.setupCountryCompliance(business.id, country);

    return business;
  }

  async setupCountryCompliance(businessId, country) {
    // This connects to the Country Compliance Service.
    // For now, we simulate inserting a few rules based on the country.
    
    const isIndia = country === 'INDIA';
    const isUAE = country === 'UAE';

    const rulesToCreate = [];

    if (isIndia) {
      rulesToCreate.push({
        businessId,
        modelName: 'Business',
        fieldName: 'gstNumber',
        ruleType: 'REQUIRED',
        severity: 'HIGH',
        description: 'GST Number is required for Indian Business. Please configure it in Settings.'
      });
      rulesToCreate.push({
        businessId,
        modelName: 'Business',
        fieldName: 'financialYearStart',
        ruleType: 'REQUIRED',
        severity: 'HIGH',
        description: 'Financial Year Start is required. Please configure it in Settings.'
      });
    }

    if (isUAE) {
      rulesToCreate.push({
        businessId,
        modelName: 'Settings',
        fieldName: 'trn',
        ruleType: 'REQUIRED',
        severity: 'HIGH',
        description: 'TRN is required for UAE Business. Please configure it in Settings.'
      });
    }

    for (const ruleData of rulesToCreate) {
      const existingRule = await prisma.complianceRule.findFirst({
        where: { businessId, fieldName: ruleData.fieldName, modelName: ruleData.modelName }
      });
      if (!existingRule) {
        await prisma.complianceRule.create({
          data: {
            ...ruleData,
            isActive: true
          }
        });
      }
    }
  }
}

module.exports = new BusinessSetupService();
