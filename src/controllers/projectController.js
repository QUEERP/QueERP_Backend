const prisma = require("../config/prisma");
const { validateAssignments } = require("../utils/validateAssignments");

exports.createProject = async (req, res) => {
  try {
    const { name, description, businessUserIds, employeeIds } = req.body;

    await validateAssignments(businessUserIds, employeeIds, req.business.id);

    const project = await prisma.project.create({
      data: {
        name,
        description,
        businessId: req.business.id,
        members: {
          create: [
            ...(businessUserIds || []).map(id => ({ businessUserId: id })),
            ...(employeeIds || []).map(id => ({ employeeId: id })),
          ],
        },
      },
      include: {
        members: { include: { businessUser: true, employee: true } },
      },
    });

    res.json({ success: true, project });

  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
//////////////////////////////////////////////////////
// GET PROJECTS
//////////////////////////////////////////////////////
exports.getProjects = async (req, res) => {
  const data = await prisma.project.findMany({
    where: { businessId: req.business.id },
    include: {
      customer: true,
      tasks: true,
      timeEntries: true,
    },
  });

  res.json({ success: true, projects: data });
};

//////////////////////////////////////////////////////
// UPDATE PROJECT
//////////////////////////////////////////////////////
exports.updateProject = async (req, res) => {
  const { id } = req.params;

  const updated = await prisma.project.update({
    where: { id },
    data: req.body,
  });

  res.json({ success: true, project: updated });
};

//////////////////////////////////////////////////////
// DELETE PROJECT
//////////////////////////////////////////////////////
exports.deleteProject = async (req, res) => {
  const { id } = req.params;

  await prisma.project.delete({
    where: { id },
  });

  res.json({ success: true, message: "Deleted" });
};

//////////////////////////////////////////////////////
// GET PROJECT SUMMARY
//////////////////////////////////////////////////////
exports.getProjectSummary = async (req, res) => {
  try {
    const { projectId } = req.params;

    // ✅ Check project belongs to business
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        businessId: req.business.id,
      },
      include: {
        members: {
          include: {
            businessUser: {
              include: { user: true },
            },
            employee: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    //////////////////////////////////////////////////////
    // TASK STATS
    //////////////////////////////////////////////////////
    const tasks = await prisma.task.findMany({
      where: { projectId },
    });

    const totalTasks = tasks.length;

    const taskStats = {
      TODO: 0,
      IN_PROGRESS: 0,
      DONE: 0,
    };

    tasks.forEach((t) => {
      taskStats[t.status]++;
    });

    //////////////////////////////////////////////////////
    // TIME STATS
    //////////////////////////////////////////////////////
    const time = await prisma.timeEntry.aggregate({
      where: {
        projectId,
        businessId: req.business.id,
      },
      _sum: {
        hours: true,
      },
    });

    const totalHours = time._sum.hours || 0;

    //////////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////////
    res.json({
      success: true,
      summary: {
        project: {
          id: project.id,
          name: project.name,
          status: project.status,
          createdAt: project.createdAt,
        },

        members: project.members,

        tasks: {
          total: totalTasks,
          stats: taskStats,
        },

        time: {
          totalHours,
        },
      },
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};