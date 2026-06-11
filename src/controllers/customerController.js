const prisma = require("../config/prisma");
const { buildPrismaQuery, getPaginationMeta, logAudit } = require("../utils/crmHelper");

//////////////////////////////////////////////////////
// CREATE CRM ACCOUNT (UPGRADED CUSTOMER)
//////////////////////////////////////////////////////
exports.createCustomer = async (req, res) => {
  try {
    const {
      company,
      region,
      vatNumber,
      phone,
      website,
      group,
      currency = "SYSTEM",
      defaultLanguage = "SYSTEM",

      address,
      city,
      state,
      zipCode,
      country,

      billingStreet,
      billingCity,
      billingState,
      billingZipCode,
      billingCountry,

      shippingStreet,
      shippingCity,
      shippingState,
      shippingZipCode,
      shippingCountry,

      // New CRM Fields
      industry,
      annualRevenue,
      employeeCount,
      accountOwnerId,
      accountType,
      parentAccountId,
      linkedinUrl,
      facebookUrl,
      twitterUrl,
      tags,
      description,
      crmStatus = "ACTIVE",
    } = req.body;

    //////////////////////////////////////////////////////
    // VALIDATIONS
    //////////////////////////////////////////////////////
    if (!company) {
      return res.status(400).json({
        success: false,
        message: "company (Account Name) is required",
      });
    }

    if (!region || !["INDIA", "UAE"].includes(region)) {
      return res.status(400).json({
        success: false,
        message: "Valid region is required (INDIA / UAE)",
      });
    }

    // Validate Account Owner (if provided)
    if (accountOwnerId) {
      const owner = await prisma.businessUser.findFirst({
        where: { id: accountOwnerId, businessId: req.business.id, isActive: true },
      });
      if (!owner) {
        return res.status(400).json({
          success: false,
          message: "Assigned account owner does not belong to this business or is inactive",
        });
      }
    }

    // Validate Parent Account (if provided)
    if (parentAccountId) {
      const parent = await prisma.customer.findFirst({
        where: { id: parentAccountId, businessId: req.business.id, isDeleted: false },
      });
      if (!parent) {
        return res.status(400).json({
          success: false,
          message: "Parent account not found",
        });
      }
    }

    // Format tags
    let formattedTags = [];
    if (typeof tags === "string") {
      formattedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    } else if (Array.isArray(tags)) {
      formattedTags = tags;
    }

    //////////////////////////////////////////////////////
    // CREATE CRM ACCOUNT
    //////////////////////////////////////////////////////
    const customer = await prisma.customer.create({
      data: {
        businessId: req.business.id,
        company,
        region,
        vatNumber,
        phone,
        website,
        group,
        currency,
        defaultLanguage,

        address,
        city,
        state,
        zipCode,
        country,

        billingStreet,
        billingCity,
        billingState,
        billingZipCode,
        billingCountry,

        shippingStreet,
        shippingCity,
        shippingState,
        shippingZipCode,
        shippingCountry,

        // Upgraded CRM Fields
        industry,
        annualRevenue: annualRevenue ? Number(annualRevenue) : null,
        employeeCount: employeeCount ? parseInt(employeeCount) : null,
        accountOwnerId,
        accountType,
        parentAccountId,
        linkedinUrl,
        facebookUrl,
        twitterUrl,
        tags: formattedTags,
        description,
        crmStatus,
      },
      include: {
      },
    });

    // Logging audit trail
    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "CREATE",
      moduleName: "CustomerAccount",
      recordId: customer.id,
      details: { company: customer.company },
    });

    res.status(201).json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("createCustomer error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL CRM ACCOUNTS (WITH PAGINATION, FILTER, SEARCH)
//////////////////////////////////////////////////////
exports.getCustomers = async (req, res) => {
  try {
    const { queryOptions, pagination } = buildPrismaQuery(req, {
      searchFields: ["company", "phone", "website", "vatNumber", "city", "country"],
      filterFields: {
        industry: "industry",
        crmStatus: "crmStatus",
        region: "region",
        accountType: "accountType",
        accountOwnerId: "accountOwnerId",
      },
      relations: {
      },
    });

    // Calculate total matching records for pagination meta
    const totalCount = await prisma.customer.count({ where: queryOptions.where });

    const customers = await prisma.customer.findMany(queryOptions);

    res.json({
      success: true,
      data: customers,
      pagination: getPaginationMeta(totalCount, pagination.page, pagination.limit),
    });
  } catch (error) {
    console.error("getCustomers error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET SINGLE CRM ACCOUNT (BY ID)
//////////////////////////////////////////////////////
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id: req.params.id,
        businessId: req.business.id,
        isDeleted: false,
      },
      include: {
        customerContacts: { where: { isDeleted: false } },
        deals: { where: { isDeleted: false } },
        activities: { where: { isDeleted: false } },
        notes: { where: { isDeleted: false }, orderBy: { createdAt: "desc" } },
        emailLogs: { orderBy: { sentAt: "desc" } },
        crmTasks: { where: { isDeleted: false } },
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    res.json({
      success: true,
      customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE CRM ACCOUNT
//////////////////////////////////////////////////////
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      region,
      annualRevenue,
      employeeCount,
      accountOwnerId,
      parentAccountId,
      tags,
      ...rest
    } = req.body;

    // Validate Account
    const existing = await prisma.customer.findFirst({
      where: { id, businessId: req.business.id, isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // Validate Region
    if (region && !["INDIA", "UAE"].includes(region)) {
      return res.status(400).json({
        success: false,
        message: "Invalid region (INDIA / UAE only)",
      });
    }

    // Validate Account Owner
    if (accountOwnerId) {
      const owner = await prisma.businessUser.findFirst({
        where: { id: accountOwnerId, businessId: req.business.id, isActive: true },
      });
      if (!owner) {
        return res.status(400).json({
          success: false,
          message: "Assigned account owner is invalid",
        });
      }
    }

    // Validate Parent Account
    if (parentAccountId) {
      if (parentAccountId === id) {
        return res.status(400).json({
          success: false,
          message: "An account cannot be its own parent",
        });
      }
      const parent = await prisma.customer.findFirst({
        where: { id: parentAccountId, businessId: req.business.id, isDeleted: false },
      });
      if (!parent) {
        return res.status(400).json({
          success: false,
          message: "Parent account not found",
        });
      }
    }

    // Format tags
    let formattedTags = undefined;
    if (tags) {
      if (typeof tags === "string") {
        formattedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      } else if (Array.isArray(tags)) {
        formattedTags = tags;
      }
    }

    const updatedData = {
      ...rest,
      ...(region && { region }),
      ...(annualRevenue !== undefined && { annualRevenue: annualRevenue ? Number(annualRevenue) : null }),
      ...(employeeCount !== undefined && { employeeCount: employeeCount ? parseInt(employeeCount) : null }),
      ...(accountOwnerId !== undefined && { accountOwnerId }),
      ...(parentAccountId !== undefined && { parentAccountId }),
      ...(formattedTags && { tags: formattedTags }),
    };

    const updated = await prisma.customer.update({
      where: { id },
      data: updatedData,
      include: {
      },
    });

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "UPDATE",
      moduleName: "CustomerAccount",
      recordId: id,
      details: updatedData,
    });

    res.json({
      success: true,
      message: "Account updated successfully",
      customer: updated,
    });
  } catch (error) {
    console.error("updateCustomer error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// SOFT DELETE CRM ACCOUNT
//////////////////////////////////////////////////////
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if account has active invoices or deals
    const invoiceCount = await prisma.invoice.count({
      where: { customerId: id, businessId: req.business.id },
    });

    const dealCount = await prisma.deal.count({
      where: { customerId: id, businessId: req.business.id, isDeleted: false },
    });

    // Instead of completely breaking historical records, we force soft-delete
    const deleted = await prisma.customer.updateMany({
      where: {
        id,
        businessId: req.business.id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found or already deleted",
      });
    }

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "DELETE_SOFT",
      moduleName: "CustomerAccount",
      recordId: id,
      details: { invoiceHistoryCount: invoiceCount, activeDealsCount: dealCount },
    });

    res.json({
      success: true,
      message: "Account soft-deleted successfully, preserving all past billing records.",
    });
  } catch (error) {
    console.error("deleteCustomer error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};