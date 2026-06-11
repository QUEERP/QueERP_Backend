const prisma = require("../config/prisma");

exports.getCrmTasks = async (req, res) => {
  try {
    const tasks = await prisma.crmTask.findMany({
      where: { businessId: req.business.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCrmTask = async (req, res) => {
  try {
    const task = await prisma.crmTask.create({
      data: {
        id: crypto.randomUUID(),
        ...req.body,
        businessId: req.business.id,
      },
    });
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCrmTask = async (req, res) => {
  try {
    const updated = await prisma.crmTask.updateMany({
      where: { id: req.params.id, businessId: req.business.id },
      data: req.body,
    });
    if (updated.count === 0)
      return res.status(404).json({ success: false, message: "Task not found" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCrmTask = async (req, res) => {
  try {
    const deleted = await prisma.crmTask.deleteMany({
      where: { id: req.params.id, businessId: req.business.id },
    });
    if (deleted.count === 0)
      return res.status(404).json({ success: false, message: "Task not found" });
    res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
