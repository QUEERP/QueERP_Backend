const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE VENDOR
//////////////////////////////////////////////////////
exports.createVendor = async (req, res) => {
  try {
    const businessId = req.business.id;

    const {
      name,
      vendorType,
      contactPerson,
      email,
      countryCode,
      phone,
      vatNumber,
      taxRegistrationNumber,
      paymentTerms,
      currency,
      openingBalance,
      creditLimit,
      preferredVendor,
      notes,
      status,
      website,
      address,
      city,
      state,
      zipCode,
      country,
    } = req.body;

    //////////////////////////////////////////////////////
    // VALIDATION
    //////////////////////////////////////////////////////
    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Vendor name is required",
      });
    }

    //////////////////////////////////////////////////////
    // VENDOR CODE GENERATION
    //////////////////////////////////////////////////////
    const vendorCount = await prisma.vendor.count({ where: { businessId } });
    const vendorCode = `VEN-${String(vendorCount + 1).padStart(4, '0')}`;

    //////////////////////////////////////////////////////
    // CREATE
    //////////////////////////////////////////////////////
    const vendor = await prisma.vendor.create({
      data: {
        businessId,
        vendorCode,
        name,
        vendorType,
        contactPerson,
        email,
        countryCode,
        phone,
        vatNumber,
        taxRegistrationNumber,
        paymentTerms,
        currency,
        openingBalance: openingBalance ? parseFloat(openingBalance) : 0,
        creditLimit: creditLimit ? parseFloat(creditLimit) : null,
        preferredVendor: preferredVendor || false,
        notes,
        status: status || 'ACTIVE',
        website,
        address,
        city,
        state,
        zipCode,
        country,
      },
    });

    res.status(201).json({
      success: true,
      data: vendor,
    });

  } catch (err) {
    console.error("createVendor error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL VENDORS (WITH SEARCH)
//////////////////////////////////////////////////////
exports.getVendors = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { search = "", page = 1, limit = 10, vendorType, status } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {
      businessId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { vendorCode: { contains: search, mode: "insensitive" } }
      ];
    }

    if (vendorType && vendorType !== "ALL") {
      where.vendorType = vendorType;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.vendor.count({ where })
    ]);

    res.json({
      success: true,
      vendors,
      total,
      totalPages: Math.ceil(total / take),
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET SINGLE VENDOR
//////////////////////////////////////////////////////
exports.getVendor = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const vendor = await prisma.vendor.findFirst({
      where: {
        id,
        businessId,
      },
      include: {
        expenses: true,
        purchaseOrders: true, // 🔥 IMPORTANT
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.json({
      success: true,
      data: vendor,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE VENDOR
//////////////////////////////////////////////////////
exports.updateVendor = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    //////////////////////////////////////////////////////
    // CHECK EXIST
    //////////////////////////////////////////////////////
    const existing = await prisma.vendor.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    //////////////////////////////////////////////////////
    // UPDATE (SAFE)
    //////////////////////////////////////////////////////
    const updateData = { ...req.body };
    if (updateData.openingBalance !== undefined) {
      updateData.openingBalance = updateData.openingBalance ? parseFloat(updateData.openingBalance) : 0;
    }
    if (updateData.creditLimit !== undefined) {
      updateData.creditLimit = updateData.creditLimit ? parseFloat(updateData.creditLimit) : null;
    }
    
    // Remove the fields that shouldn't be updated directly via req.body (like id, businessId)
    delete updateData.id;
    delete updateData.businessId;

    const updated = await prisma.vendor.updateMany({
      where: {
        id,
        businessId,
      },
      data: updateData,
    });

    res.json({
      success: true,
      message: "Vendor updated",
    });

  } catch (error) {
    console.error("updateVendor error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// DELETE VENDOR (WITH SAFETY CHECK)
//////////////////////////////////////////////////////
exports.deleteVendor = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    //////////////////////////////////////////////////////
    // CHECK EXIST
    //////////////////////////////////////////////////////
    const existing = await prisma.vendor.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    //////////////////////////////////////////////////////
    // PREVENT DELETE IF USED IN PO
    //////////////////////////////////////////////////////
    const hasPO = await prisma.purchaseOrder.findFirst({
      where: {
        vendorId: id,
      },
    });

    if (hasPO) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete vendor with purchase orders",
      });
    }

    //////////////////////////////////////////////////////
    // DELETE
    //////////////////////////////////////////////////////
    await prisma.vendor.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Vendor deleted",
    });

  } catch (error) {
    console.error("deleteVendor error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};