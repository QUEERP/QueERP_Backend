const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE LOAN
//////////////////////////////////////////////////////
exports.createLoan = async (req, res) => {
  try {
    const businessId = req.business.id;

    const {
      employeeId,
      totalAmount,
      emiAmount,
      startDate
    } = req.body;

    if (!employeeId || !totalAmount || !emiAmount) {
      return res.status(400).json({
        success: false,
        message: "employeeId, totalAmount, emiAmount required"
      });
    }

    //////////////////////////////////////////////////////
    // CHECK EMPLOYEE
    //////////////////////////////////////////////////////
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, businessId }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    //////////////////////////////////////////////////////
    // CREATE LOAN
    //////////////////////////////////////////////////////
    const loan = await prisma.loan.create({
      data: {
        employeeId,
        businessId,
        totalAmount,
        remainingAmount: totalAmount,
        emiAmount,
        startDate: startDate ? new Date(startDate) : new Date()
      }
    });

    res.json({ success: true, data: loan });

  } catch (err) {
    console.error("Create Loan Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// GET ALL LOANS
//////////////////////////////////////////////////////
exports.getLoans = async (req, res) => {
  try {
    const businessId = req.business.id;

    const loans = await prisma.loan.findMany({
      where: { businessId },
      include: { employee: true },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, data: loans });

  } catch (err) {
    console.error("Get Loans Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// GET SINGLE LOAN
//////////////////////////////////////////////////////
exports.getLoan = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const loan = await prisma.loan.findFirst({
      where: { id, businessId },
      include: { employee: true }
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found"
      });
    }

    res.json({ success: true, data: loan });

  } catch (err) {
    console.error("Get Loan Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// UPDATE LOAN
//////////////////////////////////////////////////////
exports.updateLoan = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const {
      totalAmount,
      emiAmount,
      status
    } = req.body;

    //////////////////////////////////////////////////////
    // CHECK EXISTING
    //////////////////////////////////////////////////////
    const loan = await prisma.loan.findFirst({
      where: { id, businessId }
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found"
      });
    }

    //////////////////////////////////////////////////////
    // UPDATE DATA
    //////////////////////////////////////////////////////
    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: {
        ...(totalAmount && {
          totalAmount,
          remainingAmount: totalAmount // reset if changed
        }),
        ...(emiAmount && { emiAmount }),
        ...(status && { status })
      }
    });

    res.json({ success: true, data: updatedLoan });

  } catch (err) {
    console.error("Update Loan Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// DELETE LOAN
//////////////////////////////////////////////////////
exports.deleteLoan = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    //////////////////////////////////////////////////////
    // CHECK EXISTING
    //////////////////////////////////////////////////////
    const loan = await prisma.loan.findFirst({
      where: { id, businessId }
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found"
      });
    }

    //////////////////////////////////////////////////////
    // DELETE
    //////////////////////////////////////////////////////
    await prisma.loan.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: "Loan deleted successfully"
    });

  } catch (err) {
    console.error("Delete Loan Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};