const prisma = require("../config/prisma");
const { validateTimeEntry } = require("../utils/validateTimeEntry");

exports.createTimeEntry = async (req, res) => {
  try {
    const { projectId, taskId, hours, overtime, billable, status, date, description, businessUserId, employeeId } = req.body;

    await validateTimeEntry({
      projectId,
      taskId,
      businessId: req.business.id,
    });

    const entry = await prisma.timeEntry.create({
      data: {
        projectId,
        taskId: taskId || null,
        hours: Number(hours),
        overtime: overtime ? Number(overtime) : 0,
        billable: billable !== undefined ? Boolean(billable) : true,
        status: status || 'DRAFT',
        date: date ? new Date(date) : undefined,
        description,
        businessId: req.business.id,
        businessUserId: businessUserId || null,
        employeeId: employeeId || null,
      },
    });

    res.json({ success: true, entry });

  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};


//////////////////////////////////////////////////////
// GET TIME ENTRIES
//////////////////////////////////////////////////////
exports.getTimeEntries = async (req, res) => {
  const entries = await prisma.timeEntry.findMany({
    where: { businessId: req.business.id },
    include: {
      project: { include: { projectManager: true } },
      task: true,
      employee: true
    },
    orderBy: { date: 'desc' }
  });

  res.json({ success: true, entries });
};
//////////////////////////////////////////////////////
// UPDATE TIME ENTRY
//////////////////////////////////////////////////////
exports.updateTimeEntry = async (req, res) => {
  const entry = await prisma.timeEntry.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.json({ success: true, entry });
};

//////////////////////////////////////////////////////
// DELETE TIME ENTRY
//////////////////////////////////////////////////////
exports.deleteTimeEntry = async (req, res) => {
  await prisma.timeEntry.delete({
    where: { id: req.params.id },
  });

  res.json({ success: true });
};