const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE JOURNAL ENTRY
//////////////////////////////////////////////////////
exports.createJournalEntry = async (req, res) => {
  try {
    const { entries, description, date } = req.body;

    // entries = [{ accountId, debit, credit }]

    if (!entries || entries.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least 2 entries required",
      });
    }

    //////////////////////////////////////////////////////
    // VALIDATE DEBIT = CREDIT
    //////////////////////////////////////////////////////
    const totalDebit = entries.reduce(
      (sum, e) => sum + Number(e.debit || 0),
      0
    );

    const totalCredit = entries.reduce(
      (sum, e) => sum + Number(e.credit || 0),
      0
    );

    if (totalDebit !== totalCredit) {
      return res.status(400).json({
        success: false,
        message: "Debit and Credit must be equal",
      });
    }

    //////////////////////////////////////////////////////
    // VALIDATE ACCOUNTS BELONG TO BUSINESS
    //////////////////////////////////////////////////////
    const accountIds = entries.map((e) => e.accountId);

    const validAccounts = await prisma.account.findMany({
      where: {
        id: { in: accountIds },
        businessId: req.business.id,
      },
    });

    if (validAccounts.length !== accountIds.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid account(s)",
      });
    }

    //////////////////////////////////////////////////////
    // CREATE TRANSACTION (MULTIPLE ENTRIES)
    //////////////////////////////////////////////////////
    const result = await prisma.$transaction(
      entries.map((e) =>
        prisma.journalEntry.create({
          data: {
            businessId: req.business.id,
            accountId: e.accountId,
            debit: Number(e.debit || 0),
            credit: Number(e.credit || 0),
            description,
            date: date ? new Date(date) : undefined,
          },
        })
      )
    );

    res.status(201).json({
      success: true,
      entries: result,
    });

  } catch (error) {
    console.error("createJournalEntry error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET JOURNAL ENTRIES
//////////////////////////////////////////////////////
exports.getJournalEntries = async (req, res) => {
  try {
    const entries = await prisma.journalEntry.findMany({
      where: {
        businessId: req.business.id,
      },
      include: {
        account: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    res.json({
      success: true,
      entries,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET SINGLE JOURNAL ENTRY
//////////////////////////////////////////////////////
exports.getJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await prisma.journalEntry.findFirst({
      where: {
        id,
        businessId: req.business.id,
      },
      include: {
        account: true,
      },
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found",
      });
    }

    res.json({
      success: true,
      entry,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// DELETE JOURNAL ENTRY
//////////////////////////////////////////////////////
exports.deleteJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.journalEntry.findFirst({
      where: {
        id,
        businessId: req.business.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Entry not found",
      });
    }

    await prisma.journalEntry.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Entry deleted",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};