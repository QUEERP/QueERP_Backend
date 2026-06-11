const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// PROFIT & LOSS
//////////////////////////////////////////////////////
exports.getProfitLoss = async (req, res) => {

  try {
    const entries = await prisma.journalEntry.findMany({
      where: { businessId: req.business.id },
      include: { account: true },
    });

    let income = 0;
    let expense = 0;

    entries.forEach((e) => {
      if (e.account.type === "INCOME") {
        income += e.credit - e.debit;
      }
      if (e.account.type === "EXPENSE") {
        expense += e.debit - e.credit;
      }
    });

    res.json({
      success: true,
      income,
      expense,
      profit: income - expense,
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};