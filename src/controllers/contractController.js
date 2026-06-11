const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE CONTRACT
//////////////////////////////////////////////////////
exports.createContract = async (req, res) => {
  try {
    const {
      customerId,
      typeId,
      title,
      description,
      value,
      startDate,
      endDate,
      isDeleted = false,
      isHidden = false
    } = req.body;

    //////////////////////////////////////////////////////
    // REQUIRED
    //////////////////////////////////////////////////////
    if (!customerId || !title || !value || !startDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    //////////////////////////////////////////////////////
    // VALIDATE DATE
    //////////////////////////////////////////////////////
    if (endDate && new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    //////////////////////////////////////////////////////
    // GET BUSINESS SETTINGS (Auto-create if missing)
    //////////////////////////////////////////////////////
    let settings = await prisma.settings.findUnique({
      where: {
        businessId: req.business.id,
      },
    });

    if (!settings) {
      console.log("Settings not found for business, creating defaults...");
      const business = await prisma.business.findUnique({
        where: { id: req.business.id }
      });
      
      settings = await prisma.settings.create({
        data: {
          businessId: req.business.id,
          companyName: business?.name || "My Business",
          currency: "AED", // Default fallback
        }
      });
    }

    //////////////////////////////////////////////////////
    // VALIDATE CUSTOMER
    //////////////////////////////////////////////////////
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        businessId: req.business.id,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    //////////////////////////////////////////////////////
    // VALIDATE TYPE (optional)
    //////////////////////////////////////////////////////
    if (typeId) {
      const type = await prisma.contractType.findFirst({
        where: {
          id: typeId,
          businessId: req.business.id,
        },
      });

      if (!type) {
        return res.status(404).json({
          success: false,
          message: "Contract type not found",
        });
      }
    }

    //////////////////////////////////////////////////////
    // CREATE CONTRACT
    //////////////////////////////////////////////////////
    const contract = await prisma.contract.create({
      data: {
        businessId: req.business.id,
        customerId,
        typeId,
        title,
        description,
        value,
        currency: settings.currency, // ✅ FROM SETTINGS
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isDeleted,
        isHidden,
      },
    });

    res.status(201).json({
      success: true,
      contract,
    });

  } catch (error) {
    console.error("createContract error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET CONTRACTS
//////////////////////////////////////////////////////
exports.getContracts = async (req, res) => {
  try {
    const contracts = await prisma.contract.findMany({
      where: {
        businessId: req.business.id,
        isDeleted: false,
      },
      include: {
        customer: true,
        type: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    //////////////////////////////////////////////////////
    // OPTIONAL: AUTO STATUS CHECK (🔥 SMART)
    //////////////////////////////////////////////////////
    const today = new Date();

    const updatedContracts = contracts.map((c) => ({
      ...c,
      status:
        c.endDate && new Date(c.endDate) < today
          ? "COMPLETED"
          : c.status,
    }));

    res.json({
      success: true,
      contracts: updatedContracts,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE CONTRACT
//////////////////////////////////////////////////////
exports.updateContract = async (req, res) => {
  try {
    const { id } = req.params;

    //////////////////////////////////////////////////////
    // OPTIONAL DATE VALIDATION
    //////////////////////////////////////////////////////
    if (req.body.startDate && req.body.endDate) {
      if (new Date(req.body.endDate) < new Date(req.body.startDate)) {
        return res.status(400).json({
          success: false,
          message: "End date must be after start date",
        });
      }
    }

    const updated = await prisma.contract.updateMany({
      where: {
        id,
        businessId: req.business.id,
      },
      data: req.body,
    });

    if (updated.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    res.json({
      success: true,
      message: "Contract updated",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// DELETE CONTRACT (SOFT DELETE)
//////////////////////////////////////////////////////
exports.deleteContract = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.contract.updateMany({
      where: {
        id,
        businessId: req.business.id,
      },
      data: {
        isDeleted: true,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    res.json({
      success: true,
      message: "Contract deleted",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};