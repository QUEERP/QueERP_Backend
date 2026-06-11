const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE OVERTIME
//////////////////////////////////////////////////////
exports.createOvertime = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { employeeId, extraHours, date, overmultiplier } = req.body;

    //////////////////////////////////////////////////////
    // VALIDATION
    //////////////////////////////////////////////////////
    if (!employeeId || extraHours == null || !date) {
      return res.status(400).json({
        success: false,
        message: "employeeId, extraHours and date are required",
      });
    }

    //////////////////////////////////////////////////////
    // CHECK EMPLOYEE
    //////////////////////////////////////////////////////
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, businessId },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    //////////////////////////////////////////////////////
    // CHECK DUPLICATE
    //////////////////////////////////////////////////////
    const existing = await prisma.overtime.findFirst({
      where: {
        employeeId,
        businessId,
        date: new Date(date),
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Overtime already exists for this date",
      });
    }

    //////////////////////////////////////////////////////
    // GET SETTINGS
    //////////////////////////////////////////////////////
    const settings = await prisma.settings.findUnique({
      where: { businessId },
    });

    const threshold = settings?.overtimeThreshold || 2;

    //////////////////////////////////////////////////////
    // CALCULATE OVERTIME HOURS
    //////////////////////////////////////////////////////
    const overtimeHours = Math.max(0, extraHours - threshold);

    //////////////////////////////////////////////////////
    // SAVE
    //////////////////////////////////////////////////////
    const overtime = await prisma.overtime.create({
      data: {
        employeeId,
        businessId,
        overtimeHours,
        date: new Date(date),
      },
    });

    //////////////////////////////////////////////////////
    // CALCULATE OVERTIME PAY
    //////////////////////////////////////////////////////
    const workingDays = settings?.workingDaysPerMonth || 30;
    const hoursPerDay = settings?.workingHoursPerDay || 8;
    const multiplier = overmultiplier||settings?.overtimeRate || 1.5;

    const hourlyRate =
      employee.basicSalary / workingDays / hoursPerDay;

    const overtimePay =
      overtimeHours * hourlyRate * multiplier;

    //////////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////////
    return res.status(201).json({
      success: true,
      data: {
        ...overtime,
        hourlyRate,
        overtimePay,
        overtimeMultiplier: multiplier,
      },
    });

  } catch (error) {
    console.error("Create Overtime Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL OVERTIME
//////////////////////////////////////////////////////
exports.getAllOvertime = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { employeeId, startDate, endDate } = req.query;

    //////////////////////////////////////////////////////
    // FETCH DATA
    //////////////////////////////////////////////////////
    const overtime = await prisma.overtime.findMany({
      where: {
        businessId,
        ...(employeeId && { employeeId }),
        ...(startDate && endDate && {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
      include: {
        employee: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    //////////////////////////////////////////////////////
    // GET SETTINGS
    //////////////////////////////////////////////////////
    const settings = await prisma.settings.findUnique({
      where: { businessId },
    });

    const workingDays = settings?.workingDaysPerMonth || 30;
    const hoursPerDay = settings?.workingHoursPerDay || 8;
    const multiplier = settings?.overtimeRate || 1.5;

    //////////////////////////////////////////////////////
    // CALCULATE PAY FOR EACH
    //////////////////////////////////////////////////////
    const result = overtime.map((item) => {
      const hourlyRate =
        item.employee.salary / workingDays / hoursPerDay;

      const overtimePay =
        item.overtimeHours * hourlyRate * multiplier;

      return {
        ...item,
        hourlyRate,
        overtimePay,
      };
    });

    return res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error("Get All Overtime Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

//////////////////////////////////////////////////////
// GET SINGLE OVERTIME
//////////////////////////////////////////////////////
exports.getSingleOvertime = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const overtime = await prisma.overtime.findFirst({
      where: { id, businessId },
      include: {
        employee: true,
      },
    });

    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: "Overtime not found",
      });
    }

    //////////////////////////////////////////////////////
    // GET SETTINGS
    //////////////////////////////////////////////////////
    const settings = await prisma.settings.findUnique({
      where: { businessId },
    });

    const workingDays = settings?.workingDaysPerMonth || 30;
    const hoursPerDay = settings?.workingHoursPerDay || 8;
    const multiplier = settings?.overtimeRate || 1.5;

    //////////////////////////////////////////////////////
    // CALCULATE
    //////////////////////////////////////////////////////
    const hourlyRate =
      overtime.employee.salary / workingDays / hoursPerDay;

    const overtimePay =
      overtime.overtimeHours * hourlyRate * multiplier;

    return res.json({
      success: true,
      data: {
        ...overtime,
        hourlyRate,
        overtimePay,
      },
    });

  } catch (error) {
    console.error("Get Single Overtime Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE OVERTIME
//////////////////////////////////////////////////////
exports.updateOvertime = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;
    const { extraHours, date } = req.body;

    const existing = await prisma.overtime.findFirst({
      where: { id, businessId },
      include: { employee: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Overtime not found",
      });
    }

    //////////////////////////////////////////////////////
    // GET SETTINGS
    //////////////////////////////////////////////////////
    const settings = await prisma.settings.findUnique({
      where: { businessId },
    });

    const threshold = settings?.overtimeThreshold || 2;

    //////////////////////////////////////////////////////
    // RECALCULATE
    //////////////////////////////////////////////////////
    let overtimeHours = existing.overtimeHours;

    if (extraHours != null) {
      overtimeHours = Math.max(0, extraHours - threshold);
    }

    //////////////////////////////////////////////////////
    // UPDATE
    //////////////////////////////////////////////////////
    const updated = await prisma.overtime.update({
      where: { id },
      data: {
        overtimeHours,
        ...(date && { date: new Date(date) }),
      },
    });

    //////////////////////////////////////////////////////
    // CALCULATE PAY
    //////////////////////////////////////////////////////
    const workingDays = settings?.workingDaysPerMonth || 30;
    const hoursPerDay = settings?.workingHoursPerDay || 8;
    const multiplier = settings?.overtimeRate || 1.5;

    const hourlyRate =
      existing.employee.salary / workingDays / hoursPerDay;

    const overtimePay =
      overtimeHours * hourlyRate * multiplier;

    return res.json({
      success: true,
      data: {
        ...updated,
        hourlyRate,
        overtimePay,
      },
    });

  } catch (error) {
    console.error("Update Overtime Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

//////////////////////////////////////////////////////
// DELETE OVERTIME
//////////////////////////////////////////////////////
exports.deleteOvertime = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const existing = await prisma.overtime.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Overtime not found",
      });
    }

    await prisma.overtime.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Overtime deleted successfully",
    });

  } catch (error) {
    console.error("Delete Overtime Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};