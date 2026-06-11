const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE ACCOUNT


//////////////////////////////////////////////////////
exports.createAccount = async (req, res) => {
  try {
    const { name, type, code } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: "name and type required",
      });
    }

    // prevent duplicate per business
    const exists = await prisma.account.findFirst({
      where: {
        businessId: req.business.id,
        name,
      },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Account already exists",
      });
    }

    const account = await prisma.account.create({
      data: {
        name,
        type,
        code,
        businessId: req.business.id,
      },
    });

    res.status(201).json({
      success: true,
      account,
    });

  } catch (error) {
    console.error("createAccount error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL ACCOUNTS
//////////////////////////////////////////////////////
exports.getAccounts = async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({
      where: {
        businessId: req.business.id,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      accounts,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET SINGLE ACCOUNT
//////////////////////////////////////////////////////
exports.getAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await prisma.account.findFirst({
      where: {
        id,
        businessId: req.business.id,
      },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    res.json({
      success: true,
      account,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE ACCOUNT
//////////////////////////////////////////////////////
exports.updateAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.account.findFirst({
      where: {
        id,
        businessId: req.business.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const updated = await prisma.account.update({
      where: { id },
      data: {
        name: req.body.name ?? existing.name,
        type: req.body.type ?? existing.type,
        code: req.body.code ?? existing.code,
        isActive: req.body.isActive ?? existing.isActive,
      },
    });

    res.json({
      success: true,
      account: updated,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// DELETE ACCOUNT (SOFT DELETE)
//////////////////////////////////////////////////////
exports.deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.account.findFirst({
      where: {
        id,
        businessId: req.business.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    await prisma.account.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: "Account deactivated",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// CREATE DEFAULT ACCOUNTS (AUTO SETUP)
//////////////////////////////////////////////////////
exports.createDefaultAccounts = async (req, res) => {
  try {
    const businessId = req.business.id;

    const accounts = [
      { name: "Cash", type: "ASSET" },
      { name: "Bank", type: "ASSET" },
      { name: "Accounts Receivable", type: "ASSET" },

      { name: "Accounts Payable", type: "LIABILITY" },
      { name: "Tax Payable", type: "LIABILITY" },

      { name: "Sales", type: "INCOME" },

      { name: "Purchase", type: "EXPENSE" },
      { name: "Rent Expense", type: "EXPENSE" },
      { name: "Salary Expense", type: "EXPENSE" },

      { name: "Owner Capital", type: "EQUITY" },
    ];

    await prisma.account.createMany({
      data: accounts.map((a) => ({
        ...a,
        businessId,
      })),
      skipDuplicates: true,
    });

    res.json({
      success: true,
      message: "Default accounts created",
    });

  } catch (error) {
    console.error("default accounts error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};