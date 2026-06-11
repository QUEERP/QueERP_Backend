const prisma = require("../config/prisma");

exports.getEmailLogs = async (req, res) => {
  try {
    const logs = await prisma.emailLog.findMany({
      where: { businessId: req.business.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createEmailLog = async (req, res) => {
  try {
    const log = await prisma.emailLog.create({
      data: {
        id: crypto.randomUUID(),
        ...req.body,
        businessId: req.business.id,
      },
    });
    res.status(201).json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
