const prisma = require("../config/prisma");
const { validateAssignments } = require("../utils/validateAssignments");

exports.createTask = async (req, res) => {
  try {
    const { title, projectId, businessUserIds, employeeIds } = req.body;

    await validateAssignments(businessUserIds, employeeIds, req.business.id);

    const lastTask = await prisma.task.findFirst({
      where: { projectId },
      orderBy: { order: "desc" },
    });

    const task = await prisma.task.create({
      data: {
        title,
        projectId,
        order: lastTask ? lastTask.order + 1 : 0,
        assignees: {
          create: [
            ...(businessUserIds || []).map(id => ({ businessUserId: id })),
            ...(employeeIds || []).map(id => ({ employeeId: id })),
          ],
        },
      },
      include: {
        assignees: { include: { businessUser: true, employee: true } },
      },
    });

    res.json({ success: true, task });

  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getTasksByProject = async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { projectId: req.params.projectId },
    include: {
      assignees: { include: { businessUser: true, employee: true } },
    },
    orderBy: { order: "asc" },
  });

  const kanban = { TODO: [], IN_PROGRESS: [], DONE: [] };

  tasks.forEach(t => kanban[t.status].push(t));

  res.json({ success: true, kanban });
};

exports.updateTask = async (req, res) => {
  const { id } = req.params;

  const task = await prisma.task.update({
    where: { id },
    data: {
      status: req.body.status,
      order: req.body.order,
    },
  });

  res.json({ success: true, task });
};
//////////////////////////////////////////////////////
// DELETE TASK
//////////////////////////////////////////////////////
exports.deleteTask = async (req, res) => {
  await prisma.task.delete({
    where: { id: req.params.id },
  });

  res.json({ success: true });
};