const prisma = require("../config/prisma");
const { validateAssignments } = require("../utils/validateAssignments");

exports.createProject = async (req, res) => {
  try {
    const { 
      projectCode, projectName, customerId, projectManagerId, 
      department, priority, status, budget, 
      estimatedHours, startDate, endDate, executionType,
      requirementId, estimateId
    } = req.body;

    const project = await prisma.project.create({
      data: {
        businessId: req.business.id,
        projectCode: projectCode || `PRJ-${Date.now()}`,
        projectName,
        customerId,
        projectManagerId,
        department,
        priority,
        status: status || 'ACTIVE',
        budget: Number(budget) || 0,
        estimatedHours: Number(estimatedHours) || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        executionType,
      },
      include: {
        customer: true,
        projectManager: true
      },
    });

    const numBudget = Number(budget) || 0;
    
    // Auto-create Project Budget
    await prisma.projectBudget.create({
      data: {
        budgetCode: `BUD-${project.projectCode || Date.now()}`,
        businessId: req.business.id,
        projectId: project.id,
        customerId: customerId || null,
        requirementId: requirementId || null,
        estimateId: estimateId || null,
        department: department || null,
        approvedBudget: numBudget,
        remainingBudget: numBudget,
        status: "ACTIVE",
        projectManagerId: projectManagerId || null,
      }
    });

    // Create Initial Budget History
    if (numBudget > 0) {
      await prisma.projectBudgetHistory.create({
        data: {
          businessId: req.business.id,
          projectId: project.id,
          oldBudget: 0,
          newBudget: numBudget,
          difference: numBudget,
          reason: "INITIAL_BUDGET",
          remarks: "Auto-generated budget upon project creation",
          approvedById: req.user.id,
          effectiveDate: new Date()
        }
      });
    }

    res.json({ success: true, project });

  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
//////////////////////////////////////////////////////
// GET PROJECTS
//////////////////////////////////////////////////////
exports.getProjects = async (req, res) => {
  try {
    const data = await prisma.project.findMany({
      where: { businessId: req.business.id },
      include: {
        customer: true,
        projectManager: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, projects: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
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