const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// DASHBOARD SUMMARY (PROFIT / LOSS)
//////////////////////////////////////////////////////
exports.getDashboardSummary = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { startDate, endDate } = req.query;

    const dateFilter =
      startDate && endDate
        ? {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }
        : {};

    //////////////////////////////////////////////////////
    // INCOME
    //////////////////////////////////////////////////////
    const incomeResult = await prisma.invoice.aggregate({
      _sum: { grandTotal: true },
      where: {
        businessId,
        status: "PAID",
        ...dateFilter,
      },
    });

    //////////////////////////////////////////////////////
    // EXPENSES
    //////////////////////////////////////////////////////
    const expenseResult = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        businessId,
        ...dateFilter,
      },
    });

    //////////////////////////////////////////////////////
    // SALARIES
    //////////////////////////////////////////////////////
    const salaryResult = await prisma.payslip.aggregate({
      _sum: {
        netSalary: true,
      },
      where: {
        status: "paid",
        payroll: {
          businessId,
        },
        ...dateFilter,
      },
    });

    //////////////////////////////////////////////////////
    // CALCULATIONS
    //////////////////////////////////////////////////////
    const totalIncome = incomeResult._sum.grandTotal || 0;
    const totalExpenseOnly = expenseResult._sum.amount || 0;
    const totalSalary = salaryResult._sum.netSalary || 0;

    const totalExpenses = totalExpenseOnly + totalSalary;
    const result = totalIncome - totalExpenses;

    //////////////////////////////////////////////////////
    // RESPONSE (DYNAMIC PROFIT / LOSS)
    //////////////////////////////////////////////////////
    let response = {
      totalIncome,
      totalExpenses,
      breakdown: {
        expenses: totalExpenseOnly,
        salary: totalSalary,
      },
    };

    if (result > 0) {
      response.profit = result;
    } else if (result < 0) {
      response.loss = Math.abs(result);
    } else {
      response.profit = 0; // break-even case
    }

    res.json(response);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};