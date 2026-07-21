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
      vendorId,
      currency,
      customerId,
      referenceType,
      referenceId
    } = req.body;

    if (!title || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "title and amount are required"
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
        vendorId,
        customerId: customerId || null,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        projectId: req.body.projectId || null,
        currency: currency || 'AED',
        items: req.body.items && req.body.items.length > 0 ? {
          create: req.body.items.map(item => {
            const q = Number(item.quantity || 0);
            const r = Number(item.rate || 0);
            const t = Number(item.taxPercent || 0);
            const taxAmount = (q * r * t) / 100;
            const amt = (q * r) + taxAmount;
            return {
              itemName: item.itemName || null,
              description: item.description || '',
              quantity: q,
              rate: r,
              taxPercent: t,
              taxAmount: taxAmount,
              amount: amt,
              category: item.category || null
            }
          })
        } : undefined
      },
      include: {
        items: true,
        vendor: true
      }
    });

    //////////////////////////////////////////////////////
    // UPDATE PROJECT ACTUAL COST
    //////////////////////////////////////////////////////
    if (req.body.projectId) {
      await prisma.project.update({
        where: { id: req.body.projectId },
        data: {
          actualCost: { increment: amount }
        }
      });
    }

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
    include: { vendor: true, items: true },
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
    include: { vendor: true, items: true }
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

  const updateData = { ...req.body };
  if (updateData.items) {
    // Basic support for updating items: delete old and create new
    await prisma.expenseItem.deleteMany({ where: { expenseId: id } });
    updateData.items = {
      create: req.body.items.map(item => {
        const q = Number(item.quantity || 0);
        const r = Number(item.rate || 0);
        const t = Number(item.taxPercent || 0);
        const taxAmount = (q * r * t) / 100;
        const amt = (q * r) + taxAmount;
        return {
          itemName: item.itemName || null,
          description: item.description || '',
          quantity: q,
          rate: r,
          taxPercent: t,
          taxAmount: taxAmount,
          amount: amt,
          category: item.category || null
        }
      })
    };
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: updateData,
    include: { items: true, vendor: true }
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

//////////////////////////////////////////////////////
// DOWNLOAD EXPENSE PDF
//////////////////////////////////////////////////////
exports.downloadExpensePdf = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const expense = await prisma.expense.findFirst({
      where: { id, businessId },
      include: { vendor: true, items: true, customer: true }
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    const settings = await prisma.settings.findUnique({
      where: { businessId }
    });

    const expenseTemplate = require("../templates/expenseTemplate");
    const { htmlToPdfBuffer } = require("../utils/launchBrowser");

    const html = expenseTemplate(expense, settings || {});
    const pdfBuffer = await htmlToPdfBuffer(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Expense_${expense.id.slice(0, 8)}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    return res.end(pdfBuffer);
  } catch (err) {
    console.error("downloadExpensePdf error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};