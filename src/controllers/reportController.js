const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// PROFIT & LOSS (WITH DATE FILTER)
//////////////////////////////////////////////////////
exports.getProfitLoss = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    //////////////////////////////////////////////////////
    // DATE FILTER (OPTIONAL)
    //////////////////////////////////////////////////////
    const dateFilter = {};

    if (fromDate || toDate) {
      dateFilter.date = {};
      if (fromDate) dateFilter.date.gte = new Date(fromDate);
      if (toDate) dateFilter.date.lte = new Date(toDate);
    }

    //////////////////////////////////////////////////////
    // FETCH ENTRIES
    //////////////////////////////////////////////////////
    const entries = await prisma.journalEntry.findMany({
      where: {
        businessId: req.business.id,
        ...dateFilter,
      },
      include: {
        account: true,
      },
    });

    //////////////////////////////////////////////////////
    // CALCULATE
    //////////////////////////////////////////////////////
    let income = 0;
    let expense = 0;

    entries.forEach((e) => {
      // INCOME
      if (e.account.type === "INCOME") {
        income += (e.credit || 0) - (e.debit || 0);
      }

      // EXPENSE
      if (e.account.type === "EXPENSE") {
        expense += (e.debit || 0) - (e.credit || 0);
      }
    });

    const profit = income - expense;

    //////////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////////
    res.json({
      success: true,
      income,
      expense,
      profit,
      status: profit >= 0 ? "PROFIT" : "LOSS",
    });

  } catch (error) {
    console.error("P&L error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// STOCK VALUATION REPORT
//////////////////////////////////////////////////////
exports.getStockValuation = async (req, res) => {
  try {
    const stocks = await prisma.stock.findMany({
      where: {
        warehouse: { businessId: req.business.id }
      },
      include: {
        product: {
          include: {
            units: true,
            categories: true,
            brands: true
          }
        },
        warehouse: true
      }
    });

    const items = stocks.map(s => ({
      product: {
        ...s.product,
        unit: s.product.units,
        category: s.product.categories,
        brand: s.product.brands
      },
      warehouse: s.warehouse,
      quantity: s.quantity,
      value: s.quantity * (s.product?.costPrice || 0)
    }));

    const totalValue = items.reduce((sum, item) => sum + item.value, 0);
    const totalItems = items.length;

    res.json({
      success: true,
      stockValuation: {
        totalValue,
        totalItems,
        items
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// LOW STOCK ALERTS
//////////////////////////////////////////////////////
exports.getLowStockAlerts = async (req, res) => {
  try {
    const stocks = await prisma.stock.findMany({
      where: {
        warehouse: { businessId: req.business.id }
      },
      include: {
        product: true,
        warehouse: true
      }
    });

    const alerts = stocks
      .filter(s => (s.quantity - s.reservedQty) <= (s.product?.reorderLevel || 0))
      .map(s => ({
        product: s.product,
        warehouse: s.warehouse,
        quantity: s.quantity - s.reservedQty,
        reorderLevel: s.product?.reorderLevel || 0
      }));

    res.json({
      success: true,
      alerts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// STOCK MOVEMENT SUMMARY
//////////////////////////////////////////////////////
exports.getMovementSummary = async (req, res) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      where: { businessId: req.business.id }
    });

    const summaryMap = movements.reduce((acc, m) => {
      if (!acc[m.type]) {
        acc[m.type] = { type: m.type, count: 0, totalQuantity: 0 };
      }
      acc[m.type].count += 1;
      acc[m.type].totalQuantity += Math.abs(m.quantity);
      return acc;
    }, {});

    res.json({
      success: true,
      summary: Object.values(summaryMap)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};