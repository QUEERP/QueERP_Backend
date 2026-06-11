const prisma = require("../config/prisma");
const { buildPrismaQuery, getPaginationMeta, logAudit } = require("../utils/crmHelper");

//////////////////////////////////////////////////////
// CREATE CONTACT
//////////////////////////////////////////////////////
exports.createContact = async (req, res) => {
  try {
    const {
      customerId,
      fullName,
      email,
      phone,
      position,
      isActive = true,
      isPrimary = false,
      contactOwnerId,
      tags,
    } = req.body;

    //////////////////////////////////////////////////////
    // VALIDATIONS
    //////////////////////////////////////////////////////
    if (!customerId || !fullName) {
      return res.status(400).json({
        success: false,
        message: "customerId and fullName are required",
      });
    }

    // Validate Customer (Account)
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        businessId: req.business.id,
        isDeleted: false,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Account (Customer) not found",
      });
    }

    // Validate Contact Owner (if provided)
    if (contactOwnerId) {
      const owner = await prisma.businessUser.findFirst({
        where: { id: contactOwnerId, businessId: req.business.id, isActive: true },
      });
      if (!owner) {
        return res.status(400).json({
          success: false,
          message: "Assigned contact owner does not belong to this business or is inactive",
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

    // Handle single primary contact logic per Account
    if (isPrimary) {
      await prisma.customerContact.updateMany({
        where: { customerId, businessId: req.business.id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    //////////////////////////////////////////////////////
    // CREATE CONTACT
    //////////////////////////////////////////////////////
    const contact = await prisma.customerContact.create({
      data: {
        businessId: req.business.id,
        customerId,
        fullName,
        email,
        phone,
        position,
        isActive,
        isPrimary,
        contactOwnerId,
        tags: formattedTags,
      },
      include: {
        contactOwner: { include: { user: true } },
      },
    });

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "CREATE",
      moduleName: "CustomerContact",
      recordId: contact.id,
      details: { fullName: contact.fullName, customerId },
    });

    res.status(201).json({
      success: true,
      contact,
    });
  } catch (error) {
    console.error("createContact error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL CONTACTS (WITH SEARCH, FILTER, PAGINATION)
//////////////////////////////////////////////////////
exports.getContacts = async (req, res) => {
  try {
    const { queryOptions, pagination } = buildPrismaQuery(req, {
      searchFields: ["fullName", "email", "phone", "position"],
      filterFields: {
        customerId: "customerId",
        isActive: "isActive",
        isPrimary: "isPrimary",
        contactOwnerId: "contactOwnerId",
      },
      relations: {
        customer: { select: { id: true, company: true } },
        contactOwner: { select: { id: true, user: { select: { name: true, email: true } } } },
      },
    });

    const totalCount = await prisma.customerContact.count({
      where: queryOptions.where,
    });

    const contacts = await prisma.customerContact.findMany(queryOptions);

    res.json({
      success: true,
      data: contacts,
      pagination: getPaginationMeta(totalCount, pagination.page, pagination.limit),
    });
  } catch (error) {
    console.error("getContacts error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET CONTACT BY ID
//////////////////////////////////////////////////////
exports.getContactById = async (req, res) => {
  try {
    const contact = await prisma.customerContact.findFirst({
      where: {
        id: req.params.id,
        businessId: req.business.id,
        isDeleted: false,
      },
      include: {
        customer: true,
        contactOwner: { include: { user: true } },
        deals: true,
        activities: true,
        notes: true,
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    res.json({
      success: true,
      contact,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE CONTACT
//////////////////////////////////////////////////////
exports.updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      isPrimary,
      contactOwnerId,
      tags,
      ...rest
    } = req.body;

    // Validate Contact
    const existing = await prisma.customerContact.findFirst({
      where: { id, businessId: req.business.id, isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    // Validate Owner
    if (contactOwnerId) {
      const owner = await prisma.businessUser.findFirst({
        where: { id: contactOwnerId, businessId: req.business.id, isActive: true },
      });
      if (!owner) {
        return res.status(400).json({
          success: false,
          message: "Assigned contact owner is invalid",
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

    // Handle single primary contact logic per Account
    if (isPrimary && !existing.isPrimary) {
      await prisma.customerContact.updateMany({
        where: { customerId: existing.customerId, businessId: req.business.id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const updatedData = {
      ...rest,
      ...(isPrimary !== undefined && { isPrimary }),
      ...(contactOwnerId !== undefined && { contactOwnerId }),
      ...(formattedTags && { tags: formattedTags }),
    };

    const contact = await prisma.customerContact.update({
      where: { id },
      data: updatedData,
      include: {
        contactOwner: { include: { user: true } },
      },
    });

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "UPDATE",
      moduleName: "CustomerContact",
      recordId: id,
      details: updatedData,
    });

    res.json({
      success: true,
      message: "Contact updated successfully",
      contact,
    });
  } catch (error) {
    console.error("updateContact error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// SOFT DELETE CONTACT
//////////////////////////////////////////////////////
exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.customerContact.updateMany({
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
        message: "Contact not found or already deleted",
      });
    }

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "DELETE_SOFT",
      moduleName: "CustomerContact",
      recordId: id,
    });

    res.json({
      success: true,
      message: "Contact soft-deleted successfully",
    });
  } catch (error) {
    console.error("deleteContact error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};