const prisma = require("../config/prisma");

exports.validateTimeEntry = async (data) => {
  const { projectId, taskId, businessId } = data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, businessId },
  });

  if (!project) throw new Error("Invalid project");

  if (taskId) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, projectId },
    });

    if (!task) throw new Error("Invalid task");
  }
};