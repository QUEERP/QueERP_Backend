const prisma = require("../config/prisma");

exports.getLogs = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { date } = req.query;

    let targetDate = new Date();
    if (date) {
      targetDate = new Date(date);
    }
    
    // Set start and end of day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await prisma.attendance.findMany({
      where: {
        businessId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        employee: {
          select: { name: true, id: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, logs });
  } catch (error) {
    console.error("Error fetching attendance logs:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { employeeId, status, checkIn, checkOut, date } = req.body;

    if (!employeeId || !status) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    let targetDate = new Date();
    if (date) targetDate = new Date(date);

    // Set exactly to midnight for uniqueness check
    const midnight = new Date(targetDate);
    midnight.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.upsert({
      where: {
        businessId_employeeId_date: {
          businessId,
          employeeId,
          date: midnight
        }
      },
      update: {
        status,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
      },
      create: {
        businessId,
        employeeId,
        date: midnight,
        status,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
      }
    });

    res.json({ success: true, attendance });
  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
