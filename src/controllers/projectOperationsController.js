const prisma = require("../config/prisma");
const { createStockMovement } = require("../services/inventory/movement.service");
const purchaseRequestService = require("../services/purchase/purchaseRequest.service");

// ==========================================
// PROJECT REQUIREMENTS
// ==========================================

exports.createRequirement = async (req, res) => {
  try {
    const data = req.body;
    const reqCount = await prisma.projectRequirement.count({ where: { businessId: req.business.id } });
    const requirementNumber = `REQ-${String(reqCount + 1).padStart(5, '0')}`;

    const requirement = await prisma.projectRequirement.create({
      data: {
        ...data,
        requirementNumber,
        businessId: req.business.id,
      },
    });
    res.json({ success: true, requirement });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getRequirements = async (req, res) => {
  try {
    const requirements = await prisma.projectRequirement.findMany({
      where: { businessId: req.business.id },
      include: { customer: true, assignedEmployee: true },
    });
    res.json({ success: true, requirements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateRequirement = async (req, res) => {
  try {
    const requirement = await prisma.projectRequirement.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, requirement });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ==========================================
// ESTIMATIONS
// ==========================================

exports.createEstimation = async (req, res) => {
  try {
    const data = req.body;
    const totalCost = (data.materialCost || 0) + (data.labourCost || 0) + (data.machineCost || 0) + 
                      (data.subcontractCost || 0) + (data.travelCost || 0) + (data.miscCost || 0) + 
                      (data.tax || 0);

    const estimation = await prisma.projectEstimation.create({
      data: {
        ...data,
        totalCost,
        businessId: req.business.id,
      },
    });
    res.json({ success: true, estimation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getEstimations = async (req, res) => {
  try {
    const estimations = await prisma.projectEstimation.findMany({
      where: { businessId: req.business.id },
      include: { requirement: { include: { customer: true } } },
    });
    res.json({ success: true, estimations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// PROJECTS
// ==========================================

exports.createProject = async (req, res) => {
  try {
    const data = req.body;
    let executionType = data.executionType;

    // Automatic Detection
    if (!executionType) {
      let items = [];
      if (data.quotationId) {
        const quotation = await prisma.quotation.findUnique({
          where: { id: data.quotationId },
          include: { items: true }
        });
        if (quotation) items = quotation.items;
      } else if (data.salesOrderId) {
        const salesOrder = await prisma.salesOrder.findUnique({
          where: { id: data.salesOrderId },
          include: { items: true }
        });
        if (salesOrder) items = salesOrder.items;
      }

      if (items.length > 0) {
        const hasService = items.some(item => item.itemType === "SERVICE" || item.itemType === "service");
        const hasGoods = items.some(item => item.itemType === "GOODS" || item.itemType === "goods" || item.itemType === "PRODUCT");

        if (hasService && hasGoods) {
          executionType = "HYBRID";
        } else if (hasService) {
          executionType = "SERVICE";
        } else if (hasGoods) {
          executionType = "PRODUCT";
        }
      }
    }

    const projCount = await prisma.project.count({ where: { businessId: req.business.id } });
    const projectCode = `PRJ-${String(projCount + 1).padStart(5, '0')}`;

    const project = await prisma.project.create({
      data: {
        ...data,
        projectCode,
        executionType: executionType || "SERVICE",
        businessId: req.business.id,
      },
    });
    res.json({ success: true, project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { businessId: req.business.id },
      include: { 
        customer: true, 
        projectManager: true,
        tasks: true,
        milestones: true 
      },
    });
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProjectDetails = async (req, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, businessId: req.business.id },
      include: {
        customer: true,
        projectManager: true,
        tasks: { include: { assignedTo: true, milestone: true } },
        milestones: true,
        timeEntries: true,
        expenses: true,
        invoices: true
      },
    });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ==========================================
// MILESTONES
// ==========================================

exports.createMilestone = async (req, res) => {
  try {
    const milestone = await prisma.projectMilestone.create({
      data: {
        ...req.body,
        businessId: req.business.id,
      },
    });
    res.json({ success: true, milestone });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getMilestones = async (req, res) => {
  try {
    const milestones = await prisma.projectMilestone.findMany({
      where: { projectId: req.params.projectId, businessId: req.business.id },
    });
    res.json({ success: true, milestones });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// TASKS
// ==========================================

exports.createTask = async (req, res) => {
  try {
    const taskCount = await prisma.projectTask.count({ where: { businessId: req.business.id } });
    const taskNumber = `TSK-${String(taskCount + 1).padStart(5, '0')}`;

    const task = await prisma.projectTask.create({
      data: {
        ...req.body,
        taskNumber,
        businessId: req.business.id,
      },
    });
    res.json({ success: true, task });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const tasks = await prisma.projectTask.findMany({
      where: { projectId: req.params.projectId, businessId: req.business.id },
      include: { assignedTo: true, milestone: true }
    });
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await prisma.projectTask.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, task });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ==========================================
// ISSUES
// ==========================================

exports.createIssue = async (req, res) => {
  try {
    const issueCount = await prisma.projectIssue.count({ where: { businessId: req.business.id } });
    const issueNumber = `ISS-${String(issueCount + 1).padStart(5, '0')}`;

    const issue = await prisma.projectIssue.create({
      data: {
        ...req.body,
        issueNumber,
        businessId: req.business.id,
      },
    });
    res.json({ success: true, issue });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getIssues = async (req, res) => {
  try {
    const issues = await prisma.projectIssue.findMany({
      where: { projectId: req.params.projectId, businessId: req.business.id },
      include: { assignedTo: true, reporter: true }
    });
    res.json({ success: true, issues });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateIssue = async (req, res) => {
  try {
    const issue = await prisma.projectIssue.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, issue });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ==========================================
// CHANGE REQUESTS
// ==========================================

exports.createChangeRequest = async (req, res) => {
  try {
    const crCount = await prisma.projectChangeRequest.count({ where: { businessId: req.business.id } });
    const crNumber = `CR-${String(crCount + 1).padStart(5, '0')}`;

    const changeRequest = await prisma.projectChangeRequest.create({
      data: {
        ...req.body,
        crNumber,
        businessId: req.business.id,
      },
    });
    res.json({ success: true, changeRequest });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getChangeRequests = async (req, res) => {
  try {
    const changeRequests = await prisma.projectChangeRequest.findMany({
      where: { projectId: req.params.projectId, businessId: req.business.id },
      include: { requestedBy: true }
    });
    res.json({ success: true, changeRequests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateChangeRequest = async (req, res) => {
  try {
    const changeRequest = await prisma.projectChangeRequest.update({
      where: { id: req.params.id },
      data: req.body,
    });

    // If approved, dynamically update project budget
    if (req.body.status === 'APPROVED' && changeRequest.costImpact) {
      await prisma.project.update({
        where: { id: changeRequest.projectId },
        data: { budget: { increment: changeRequest.costImpact } }
      });
    }

    res.json({ success: true, changeRequest });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ==========================================
// TIMESHEETS / TIME ENTRIES
// ==========================================

exports.createTimeEntry = async (req, res) => {
  try {
    const data = req.body;
    
    // Validate Employee Hourly Rate if employee is assigned
    let cost = 0;
    if (data.employeeId) {
      const emp = await prisma.employee.findUnique({ where: { id: data.employeeId } });
      if (emp && emp.hourlyRate) {
        cost = emp.hourlyRate * (data.hours || 0);
      }
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        businessId: req.business.id,
        projectId: data.projectId,
        taskId: data.taskId,
        employeeId: data.employeeId,
        businessUserId: data.businessUserId,
        description: data.description,
        hours: data.hours,
        date: data.date ? new Date(data.date) : new Date()
      },
    });

    // Automate Project Cost Update if cost could be calculated
    if (cost > 0) {
      await prisma.project.update({
        where: { id: data.projectId },
        data: { 
          actualCost: { increment: cost },
          laborCost: { increment: cost } 
        }
      });
    }

    res.json({ success: true, timeEntry, costApplied: cost });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getTimeEntries = async (req, res) => {
  try {
    const entries = await prisma.timeEntry.findMany({
      where: { projectId: req.params.projectId, businessId: req.business.id },
      include: { employee: true, task: true }
    });
    res.json({ success: true, entries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// INVENTORY CONSUMPTION
// ==========================================

exports.consumeMaterial = async (req, res) => {
  try {
    const { projectId, productId, warehouseId, quantity, notes } = req.body;
    
    // Deduct stock using the service and log expense
    let cogsAmount = 0;
    await prisma.$transaction(async (tx) => {
      const movement = await createStockMovement(tx, {
        businessId: req.business.id,
        productId,
        warehouseId,
        quantity: -Math.abs(quantity),
        type: "INTERNAL_CONSUMPTION",
        referenceType: "PROJECT",
        referenceId: projectId,
        notes: notes || "Material consumption for project execution"
      });

      cogsAmount = movement.cogsAmount || 0;

      // Log Expense
      await tx.expense.create({
         data: {
            businessId: req.business.id,
            projectId,
            title: "Material Consumption",
            amount: cogsAmount,
            category: "Material",
            paymentMethod: "Internal",
            date: new Date(),
            notes: `Inventory consumption: ${quantity} units`
         }
      });

      // Update Project Actual Cost
      await tx.project.update({
        where: { id: projectId },
        data: { 
          actualCost: { increment: cogsAmount },
          materialCost: { increment: cogsAmount } 
        }
      });
    });

    res.json({ success: true, message: "Material consumed successfully.", costApplied: cogsAmount });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ==========================================
// PROCUREMENT INTEGRATION
// ==========================================

exports.createPurchaseRequest = async (req, res) => {
  try {
    const data = { ...req.body, projectId: req.params.projectId };
    const request = await purchaseRequestService.createPurchaseRequest(
      req.business.id,
      req.user.id,
      req.user.email,
      data
    );
    res.json({ success: true, request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getPurchaseRequests = async (req, res) => {
  try {
    const requests = await prisma.purchaseRequest.findMany({
      where: { projectId: req.params.projectId, businessId: req.business.id },
      include: {
        requester: { select: { id: true, user: { select: { name: true, email: true } } } },
        items: { include: { product: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPurchaseOrders = async (req, res) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: { projectId: req.params.projectId, businessId: req.business.id },
      include: {
        vendor: true,
        items: true
      },
      orderBy: { orderDate: "desc" }
    });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// PROJECT TEMPLATES
// ==========================================

exports.createTemplate = async (req, res) => {
  try {
    const template = await prisma.projectTemplate.create({
      data: {
        ...req.body,
        businessId: req.business.id
      }
    });
    res.json({ success: true, template });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getTemplates = async (req, res) => {
  try {
    const templates = await prisma.projectTemplate.findMany({
      where: { businessId: req.business.id }
    });
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// PORTFOLIO MANAGEMENT
// ==========================================

exports.getPortfolioDashboard = async (req, res) => {
  try {
    const { customerId } = req.query;
    const whereClause = { businessId: req.business.id };
    if (customerId) whereClause.customerId = customerId;

    const projects = await prisma.project.findMany({ where: whereClause });
    
    let totalBudget = 0;
    let totalCost = 0;
    let totalRevenue = 0;
    let totalInvoiced = 0;
    let totalCollected = 0;
    let delayedProjects = 0;

    projects.forEach(p => {
      totalBudget += (p.budget || 0);
      totalCost += (p.actualCost || 0) + (p.committedCost || 0);
      totalRevenue += (p.revenue || 0);
      totalInvoiced += (p.invoicedRevenue || 0);
      totalCollected += (p.collectedRevenue || 0);
      if (p.endDate && new Date(p.endDate) < new Date() && p.status !== 'COMPLETED') {
        delayedProjects++;
      }
    });

    res.json({
      success: true,
      portfolio: {
        totalProjects: projects.length,
        delayedProjects,
        totalBudget,
        totalCost,
        totalRevenue,
        totalInvoiced,
        totalCollected,
        expectedProfit: totalRevenue - totalCost,
        margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// RESOURCE PLANNING
// ==========================================

exports.getResourceUtilization = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        businessId: req.business.id,
        date: { gte: thirtyDaysAgo }
      },
      include: { employee: true, project: { select: { projectName: true } } }
    });

    const utilization = {};
    timeEntries.forEach(entry => {
      if (entry.employeeId) {
        if (!utilization[entry.employeeId]) {
          utilization[entry.employeeId] = {
             employeeName: entry.employee ? `${entry.employee.firstName} ${entry.employee.lastName}` : 'Unknown',
             totalHours: 0,
             projects: new Set()
          };
        }
        utilization[entry.employeeId].totalHours += entry.hours;
        if (entry.project) utilization[entry.employeeId].projects.add(entry.project.projectName);
      }
    });

    const formatted = Object.values(utilization).map(u => ({
       ...u,
       projects: Array.from(u.projects),
       utilizationPercentage: (u.totalHours / 160) * 100
    }));

    res.json({ success: true, resources: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
