const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE VENDOR
//////////////////////////////////////////////////////
exports.createVendor = async (req, res) => {
  try {
    const businessId = req.business.id;

    const {
      name,
      email,
      phone,
      vatNumber,
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
    // CREATE
    //////////////////////////////////////////////////////
    const vendor = await prisma.vendor.create({
      data: {
        businessId,
        name,
        email,
        phone,
        vatNumber,
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
    const { search = "" } = req.query;

    const vendors = await prisma.vendor.findMany({
      where: {
        businessId,
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: vendors,
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
    const updated = await prisma.vendor.updateMany({
      where: {
        id,
        businessId,
      },
      data: req.body,
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