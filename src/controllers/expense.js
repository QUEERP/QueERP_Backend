const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE EXPENSE
//////////////////////////////////////////////////////
exports.createExpense = async (req, res) => {
  try {
    const businessId = req.business.id;

    const {
      title,
      amount,
      category,
      paymentMethod,
      date,
      notes,
      vendorId
    } = req.body;

    if (!title || !amount || !category) {
      return res.status(400).json({
        success: false,
        message: "title, amount, category required"
      });
    }

    //////////////////////////////////////////////////////
    // OPTIONAL VENDOR CHECK
    //////////////////////////////////////////////////////
    if (vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: { id: vendorId, businessId }
      });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found"
        });
      }
    }

    const expense = await prisma.expense.create({
      data: {
        businessId,
        title,
        amount,
        category,
        paymentMethod,
        date: date ? new Date(date) : new Date(),
        notes,
        vendorId
      }
    });

    res.json({ success: true, data: expense });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// GET ALL EXPENSES
//////////////////////////////////////////////////////
exports.getExpenses = async (req, res) => {
  const businessId = req.business.id;

  const expenses = await prisma.expense.findMany({
    where: { businessId },
    include: { vendor: true },
    orderBy: { date: "desc" }
  });

  res.json({ success: true, data: expenses });
};

//////////////////////////////////////////////////////
// GET SINGLE EXPENSE
//////////////////////////////////////////////////////
exports.getExpense = async (req, res) => {
  const businessId = req.business.id;
  const { id } = req.params;

  const expense = await prisma.expense.findFirst({
    where: { id, businessId },
    include: { vendor: true }
  });

  if (!expense) {
    return res.status(404).json({
      success: false,
      message: "Expense not found"
    });
  }

  res.json({ success: true, data: expense });
};

//////////////////////////////////////////////////////
// UPDATE EXPENSE
//////////////////////////////////////////////////////
exports.updateExpense = async (req, res) => {
  const businessId = req.business.id;
  const { id } = req.params;

  const existing = await prisma.expense.findFirst({
    where: { id, businessId }
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Expense not found"
    });
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: req.body
  });

  res.json({ success: true, data: updated });
};

//////////////////////////////////////////////////////
// DELETE EXPENSE
//////////////////////////////////////////////////////
exports.deleteExpense = async (req, res) => {
  const businessId = req.business.id;
  const { id } = req.params;

  const existing = await prisma.expense.findFirst({
    where: { id, businessId }
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Expense not found"
    });
  }

  await prisma.expense.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: "Expense deleted"
  });
};