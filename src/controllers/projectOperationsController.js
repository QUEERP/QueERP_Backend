const prisma = require("../config/prisma");
const { createStockMovement } = require("../services/inventory/movement.service");
const purchaseRequestService = require("../services/purchase/purchaseRequest.service");

// ==========================================
// PROJECT REQUIREMENTS
// ==========================================

exports.getInquiriesByCustomer = async (req, res) => {
  try {
    const { customerId, status } = req.query;
    
    console.log("=== LINKED INQUIRIES API CALLED ===");
    console.log({
      customerId,
      businessId: req.business?.id,
      status
    });

    if (!customerId) {
      return res.status(400).json({ success: false, message: "customerId is required" });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId: req.business.id }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const customerCompany = customer.company || customer.name;

    const whereClause = {
      customerId: customerId,
      businessId: req.business.id,
      isDeleted: false
    };

    console.log("Prisma Query Where:", whereClause);

    const inquiries = await prisma.lead.findMany({
      where: whereClause,
      select: {
        id: true,
        inquiryNumber: true,
        inquiryTitle: true,
        status: true,
        name: true,
        phone: true,
        email: true,
        company: true,
        description: true,
        budgetRange: true,
        priority: true,
        projectType: true,
        expectedDuration: true,
        source: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`=== INQUIRY QUERY RESULT: ${inquiries.length} records found ===`);

    const formattedInquiries = inquiries.map(inq => ({
      id: inq.id,
      inquiryNo: inq.inquiryNumber,
      title: inq.inquiryTitle || inq.name,
      status: inq.status,
      createdAt: inq.createdAt,
      customerName: customerCompany,
      // Extra fields for autofill
      contactPerson: inq.name,
      contactNumber: inq.phone,
      email: inq.email,
      company: inq.company,
      description: inq.description,
      estimatedBudget: inq.budgetRange,
      priority: inq.priority,
      projectCategory: inq.projectType,
      expectedTimeline: inq.expectedDuration,
      source: inq.source
    }));

    res.json({ success: true, inquiries: formattedInquiries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createRequirement = async (req, res) => {
  try {
    const { linkedInquiry, ...data } = req.body;
    console.log("Create Requirement Request Body:", req.body);
    const reqCount = await prisma.projectRequirement.count({ where: { businessId: req.business.id } });
    const requirementNumber = `REQ-${String(reqCount + 1).padStart(5, '0')}`;

    const requirement = await prisma.projectRequirement.create({
      data: {
        ...data,
        requirementNumber,
        businessId: req.business.id,
        createdBy: req.user?.id,
      },
    });

    if (linkedInquiry) {
      await prisma.lead.update({
        where: { id: linkedInquiry },
        data: { requirementId: requirement.id }
      });
    }

    res.json({ success: true, requirement });
  } catch (err) {
    console.error("Create Requirement Error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getRequirements = async (req, res) => {
  try {
    const { customerId, status } = req.query;
    const where = { businessId: req.business.id };
    
    if (customerId) {
      where.customerId = customerId;
    }
    if (status) {
      if (status.toLowerCase() === 'open') {
        where.status = { notIn: ['Closed', 'Rejected', 'Cancelled'] };
      } else {
        where.status = { contains: status, mode: 'insensitive' };
      }
    }

    const requirements = await prisma.projectRequirement.findMany({
      where,
      include: { customer: true, assignedEmployee: true, inquiries: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, requirements });
  } catch (err) {
    console.error("Error fetching requirements:", err);
    res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
};

exports.getRequirementDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const requirement = await prisma.projectRequirement.findFirst({
      where: { id, businessId: req.business.id },
      include: { customer: true, inquiries: true, estimations: true }
    });
    if (!requirement) {
      return res.status(404).json({ success: false, message: "Requirement not found" });
    }
    res.json({ success: true, requirement });
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

    // Remove fields not in the schema
    const { customerId, inquiry, estNumber, estName, projectType, executionType, version, preparedBy, preparedDate, currency, projPriority, projDuration, projSize, expStart, expEnd, labour, material, software, thirdParty, expenses, riskBufferPct, discountPct, markupPct, taxPct, exchangeRate, reviewedBy, approvedBy, approvalStatus, approvalNotes, linkedReq, customer, ...validData } = data;

    const estimation = await prisma.projectEstimation.create({
      data: {
        ...validData,
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
    const { requirementId, customerId, status } = req.query;
    const where = { businessId: req.business.id };
    
    if (requirementId) {
      where.requirementId = requirementId;
    }
    if (customerId) {
      where.customerId = customerId;
    }
    if (status) {
      where.status = { contains: status, mode: 'insensitive' };
    }

    const estimations = await prisma.projectEstimation.findMany({
      where,
      include: { requirement: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, estimations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createMeeting = async (req, res) => {
  try {
    const data = req.body;
    console.log("Create Meeting Request Body:", data);
    
    const meeting = await prisma.projectMeeting.create({
      data: {
        ...data,
        businessId: req.business.id,
        createdBy: req.user?.id,
      },
    });

    res.json({ success: true, meeting });
  } catch (err) {
    console.error("Create Meeting Error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getMeetings = async (req, res) => {
  try {
    const meetings = await prisma.projectMeeting.findMany({
      where: { businessId: req.business.id },
      include: { requirement: true, customer: true },
    });
    res.json({ success: true, meetings });
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

    if (data.budget !== undefined && data.budget !== null) {
      data.budget = parseFloat(data.budget) || 0;
    }
    
    if (data.startDate) {
      data.startDate = new Date(data.startDate).toISOString();
    }
    
    if (data.endDate) {
      data.endDate = new Date(data.endDate).toISOString();
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
    console.error("Create Project Error:", err);
    let errorMessage = "Failed to create project. Please check your inputs.";
    if (err.message && err.message.includes('Invalid `prisma')) {
       const match = err.message.match(/argument `.*?`: (.*)/i);
       if (match) errorMessage = match[0];
    } else if (err.message) {
       errorMessage = err.message;
    }
    res.status(400).json({ success: false, message: errorMessage });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const { customerId } = req.query;
    const where = { businessId: req.business.id };
    if (customerId) where.customerId = customerId;

    const projects = await prisma.project.findMany({
      where,
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
    const { title, description, targetDate, completionPercentage, status, paymentWeight, ownerId } = req.body;
    
    if (!req.params.projectId) {
      return res.status(400).json({ success: false, message: 'projectId is required in URL.' });
    }

    const milestone = await prisma.projectMilestone.create({
      data: {
        businessId: req.business.id,
        projectId: req.params.projectId,
        name: title || 'Untitled Milestone',
        description: description || null,
        ownerId: ownerId || null,
        weight: parseFloat(paymentWeight) || 0,
        dueDate: targetDate ? new Date(targetDate) : null,
        status: status || 'Pending',
        completion: parseFloat(completionPercentage) || 0,
      },
    });
    res.json({ success: true, milestone });
  } catch (err) {
    console.error('Create Milestone Error:', err.message);
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

exports.getGlobalMilestones = async (req, res) => {
  try {
    const milestones = await prisma.projectMilestone.findMany({
      where: { businessId: req.business.id },
      include: { owner: true, project: true },
      orderBy: { createdAt: 'desc' }
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

    const {
      projectId, milestoneId, title, description, priority, status,
      assignedToId, startDate, dueDate, estimatedHours, actualHours,
      completionPercentage, checklist, dependencies, assignedTeam
    } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, message: 'projectId is required.' });
    }

    const task = await prisma.projectTask.create({
      data: {
        businessId: req.business.id,
        projectId,
        taskNumber,
        title: title || 'Untitled Task',
        description: description || null,
        priority: priority || null,
        status: status || 'TODO',
        assignedToId: assignedToId || null,
        milestoneId: milestoneId || null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours: parseFloat(estimatedHours) || 0,
        actualHours: parseFloat(actualHours) || 0,
        completionPercentage: parseFloat(completionPercentage) || 0,
        checklist: checklist || null,
        dependencies: dependencies || null,
        assignedTeam: assignedTeam || null,
      },
    });
    res.json({ success: true, task });
  } catch (err) {
    console.error('Create Task Error:', err.message);
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

exports.getGlobalTasks = async (req, res) => {
  try {
    const tasks = await prisma.projectTask.findMany({
      where: { businessId: req.business.id },
      include: { assignedTo: true, project: true, milestone: true },
      orderBy: { createdAt: 'desc' }
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
    const issueCode = `ISS-${String(issueCount + 1).padStart(5, '0')}`;

    const { projectId, title, description, module, severity, priority, impact, rootCause, reporterId, assigneeId, dueDate } = req.body;

    const issue = await prisma.projectIssue.create({
      data: {
        businessId: req.business.id,
        projectId,
        issueCode,
        title,
        description,
        module,
        severity,
        priority,
        impact,
        rootCause,
        reporterId,
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
    res.json({ success: true, issue });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAllIssues = async (req, res) => {
  try {
    const issues = await prisma.projectIssue.findMany({
      where: { businessId: req.business.id },
      include: { project: true, assignee: true, reporter: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, issues });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
    const requestNumber = `CR-${String(crCount + 1).padStart(5, '0')}`;

    const changeRequest = await prisma.projectChangeRequest.create({
      data: {
        ...req.body,
        requestNumber,
        businessId: req.business.id,
      },
    });
    res.json({ success: true, changeRequest });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAllChangeRequests = async (req, res) => {
  try {
    const changeRequests = await prisma.projectChangeRequest.findMany({
      where: { businessId: req.business.id },
      include: { project: true, requestedBy: true, assignedTo: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, changeRequests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
// BUDGETS
// ==========================================

exports.getGlobalBudgets = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { businessId: req.business.id },
      include: {
        expenses: { select: { amount: true, status: true } },
        purchaseOrders: { select: { totalAmount: true, status: true } },
        customer: true,
        projectManager: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const enrichedBudgets = projects.filter(p => p.budget > 0).map(p => {
      const actualCost = p.expenses?.filter(e => e.status === 'APPROVED' || e.status === 'PAID').reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const committedCost = p.purchaseOrders?.filter(po => po.status !== 'CANCELLED').reduce((sum, po) => sum + (po.totalAmount || 0), 0) || 0;
      
      const utilized = actualCost + committedCost;
      const remaining = (p.budget || 0) - utilized;
      const variance = remaining;
      const utilizationPercent = p.budget > 0 ? (utilized / p.budget) * 100 : 0;
      
      let computedStatus = p.status || "ACTIVE";
      if (p.budget > 0 && computedStatus !== 'COMPLETED') {
        if (utilizationPercent > 100) computedStatus = "OVER_BUDGET";
        else if (utilizationPercent >= 81) computedStatus = "AT_RISK";
        else computedStatus = "ON_TRACK";
      }

      return {
        id: p.id,
        budgetCode: `BUD-${p.projectCode || p.id.substring(0,6)}`,
        projectId: p.id,
        project: p,
        customer: p.customer,
        department: p.department || 'General',
        projectManager: p.projectManager,
        approvedBudget: p.budget,
        actualCost,
        committedCost,
        remainingBudget: remaining,
        variance,
        utilizationPercent: parseFloat(utilizationPercent.toFixed(2)),
        budgetStatus: computedStatus,
        budgetHistories: p.budgetHistories || []
      };
    });

    res.json({ success: true, budgets: enrichedBudgets });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.reallocateBudget = async (req, res) => {
  try {
    const { fromProjectId, toProjectId, amount, reason, effectiveDate, remarks, projectId, additionalBudget } = req.body;
    
    // Legacy support for single project addition/subtraction
    if (projectId && additionalBudget !== undefined) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, businessId: req.business.id }
      });
      if (!project) return res.status(404).json({ success: false, message: "Project not found." });

      const oldBudget = project.budget || 0;
      const newBudget = oldBudget + parseFloat(additionalBudget);

      await prisma.$transaction([
        prisma.projectBudgetHistory.create({
          data: {
            businessId: req.business.id,
            projectId: project.id,
            oldBudget,
            newBudget,
            difference: parseFloat(additionalBudget),
            reason,
            remarks,
            effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
            approvedById: req.user?.id
          }
        }),
        prisma.project.update({
          where: { id: project.id },
          data: { budget: newBudget }
        })
      ]);

      return res.json({ success: true, message: "Budget reallocated successfully." });
    }

    // New Transfer logic
    if (!fromProjectId || !toProjectId || !amount) {
      return res.status(400).json({ success: false, message: "Source project, target project, and amount are required." });
    }

    const fromProject = await prisma.project.findFirst({ where: { id: fromProjectId, businessId: req.business.id } });
    const toProject = await prisma.project.findFirst({ where: { id: toProjectId, businessId: req.business.id } });

    if (!fromProject || !toProject) return res.status(404).json({ success: false, message: "Project not found." });

    const transferAmount = parseFloat(amount);
    
    const fromOldBudget = fromProject.budget || 0;
    const fromNewBudget = fromOldBudget - transferAmount;
    
    // Validation
    if (fromNewBudget < 0) {
      return res.status(400).json({ success: false, message: "Insufficient budget in source project." });
    }

    const toOldBudget = toProject.budget || 0;
    const toNewBudget = toOldBudget + transferAmount;

    await prisma.$transaction([
      prisma.projectBudgetHistory.create({
        data: {
          businessId: req.business.id,
          projectId: fromProject.id,
          oldBudget: fromOldBudget,
          newBudget: fromNewBudget,
          difference: -transferAmount,
          reason: reason || "Transfer Out",
          remarks,
          effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
          approvedById: req.user?.id
        }
      }),
      prisma.project.update({
        where: { id: fromProject.id },
        data: { budget: fromNewBudget }
      }),
      prisma.projectBudgetHistory.create({
        data: {
          businessId: req.business.id,
          projectId: toProject.id,
          oldBudget: toOldBudget,
          newBudget: toNewBudget,
          difference: transferAmount,
          reason: reason || "Transfer In",
          remarks,
          effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
          approvedById: req.user?.id
        }
      }),
      prisma.project.update({
        where: { id: toProject.id },
        data: { budget: toNewBudget }
      })
    ]);

    res.json({ success: true, message: "Budget transferred successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// EXPENSES
// ==========================================

exports.createGlobalExpense = async (req, res) => {
  try {
    const { title, amount, category, paymentMethod, date, projectId, employeeId, notes, status } = req.body;
    const expense = await prisma.expense.create({
      data: {
        businessId: req.business.id,
        title,
        amount: parseFloat(amount),
        category: category || 'Other',
        paymentMethod: paymentMethod || 'Cash',
        date: date ? new Date(date) : new Date(),
        projectId: projectId || null,
        employeeId: employeeId || null,
        notes,
        status: status || 'Draft'
      }
    });

    res.status(201).json({ success: true, expense });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getGlobalExpenses = async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { businessId: req.business.id },
      include: {
        project: { select: { projectName: true, projectCode: true, id: true } },
        employee: { select: { name: true, id: true } },
        task: { select: { title: true, id: true } },
        vendor: { select: { name: true, id: true } },
        manager: { select: { name: true } },
        finance: { select: { name: true } },
        auditLogs: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, expenses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateGlobalExpenseWorkflow = async (req, res) => {
  try {
    const { expenseId, action, comments } = req.body; 

    if (!expenseId || !action) {
      return res.status(400).json({ success: false, message: "Expense ID and action are required." });
    }

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, businessId: req.business.id }
    });

    if (!expense) return res.status(404).json({ success: false, message: "Expense not found." });

    let newStatus = expense.status;
    let managerId = expense.managerId;
    let financeId = expense.financeId;
    let updateProjectCost = false;

    if (action === "Submit") newStatus = "Submitted";
    else if (action === "Approve (Manager)") {
      newStatus = "Finance Approval";
      managerId = req.user?.id;
    } else if (action === "Approve (Finance)") {
      newStatus = "Approved";
      financeId = req.user?.id;
      updateProjectCost = true;
    } else if (action === "Reimburse") newStatus = "Reimbursed";
    else if (action === "Reject") newStatus = "Rejected";
    
    await prisma.$transaction(async (tx) => {
      // 1. Update Expense
      await tx.expense.update({
        where: { id: expense.id },
        data: { status: newStatus, managerId, financeId }
      });

      // 2. Add Audit Log
      await tx.expenseAuditLog.create({
        data: {
          businessId: req.business.id,
          expenseId: expense.id,
          action: action,
          comments: comments || "",
          performedBy: req.user?.id || req.user?.name || 'System'
        }
      });

      // 3. Update Project Cost if Approved
      if (updateProjectCost && expense.projectId) {
        await tx.project.update({
          where: { id: expense.projectId },
          data: { actualCost: { increment: expense.amount } }
        });
        
        const projBudget = await tx.projectBudget.findUnique({
          where: { projectId: expense.projectId }
        });
        
        if (projBudget) {
          await tx.projectBudget.update({
            where: { id: projBudget.id },
            data: {
              actualCost: { increment: expense.amount },
              remainingBudget: { decrement: expense.amount }
            }
          });
        }
      }
    });

    res.json({ success: true, message: `Expense ${action} successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// BILLING / INVOICES
// ==========================================

exports.createGlobalInvoice = async (req, res) => {
  try {
    const { customerId, projectId, dueDate, amount, status } = req.body;
    
    // Auto-generate invoice number (simple format)
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    
    const invoice = await prisma.invoice.create({
      data: {
        businessId: req.business.id,
        invoiceNumber,
        customerId: customerId || null,
        projectId: projectId || null,
        invoiceDate: new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        grandTotal: parseFloat(amount),
        subTotal: parseFloat(amount),
        totalTax: 0,
        status: status || 'DRAFT',
        terms: "Created from Global Billing",
      }
    });

    res.status(201).json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getGlobalBilling = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { businessId: req.business.id, isDeleted: false },
      include: {
        customer: true,
        project: { select: { projectName: true, projectCode: true, id: true } },
        payments: true,
        auditLogs: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateGlobalInvoiceWorkflow = async (req, res) => {
  try {
    const { invoiceId, action, comments } = req.body; 

    if (!invoiceId || !action) {
      return res.status(400).json({ success: false, message: "Invoice ID and action are required." });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, businessId: req.business.id }
    });

    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found." });

    let newStatus = invoice.status;

    if (action === "Send") newStatus = "SENT";
    else if (action === "Cancel") newStatus = "CANCELLED";
    
    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus }
      });

      await tx.invoiceAuditLog.create({
        data: {
          businessId: req.business.id,
          invoiceId: invoice.id,
          action: action === "Send" ? "Sent" : "Cancelled",
          comments: comments || "",
          performedBy: req.user?.id || req.user?.name || 'System'
        }
      });
    });

    res.json({ success: true, message: `Invoice ${action} successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addGlobalInvoicePayment = async (req, res) => {
  try {
    const { invoiceId, amount, paymentMode, note } = req.body; 

    if (!invoiceId || !amount) {
      return res.status(400).json({ success: false, message: "Invoice ID and amount are required." });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, businessId: req.business.id },
      include: { payments: true }
    });

    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found." });

    const totalPaidBefore = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const newTotalPaid = totalPaidBefore + parseFloat(amount);
    
    let newStatus = invoice.status;
    if (newTotalPaid >= invoice.grandTotal) {
      newStatus = "PAID";
    } else {
      newStatus = "PARTIALLY_PAID";
    }
    
    await prisma.$transaction(async (tx) => {
      // Create Payment
      const pCount = await tx.payment.count({ where: { businessId: req.business.id } });
      const payNum = `PAY-${String(pCount + 1).padStart(5, '0')}`;
      
      await tx.payment.create({
        data: {
          businessId: req.business.id,
          invoiceId: invoice.id,
          amount: parseFloat(amount),
          paymentDate: new Date(),
          paymentMode: paymentMode || "Bank Transfer",
          note: note,
          createdBy: req.user?.id || 'System',
          paymentNumber: payNum
        }
      });

      // Update Invoice Status
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus }
      });

      // Update Project Revenue
      if (invoice.projectId) {
        await tx.project.update({
          where: { id: invoice.projectId },
          data: { revenue: { increment: parseFloat(amount) } }
        });
      }

      // Add Audit Log
      await tx.invoiceAuditLog.create({
        data: {
          businessId: req.business.id,
          invoiceId: invoice.id,
          action: "Payment Received",
          comments: `Amount: $${amount} via ${paymentMode}`,
          performedBy: req.user?.id || req.user?.name || 'System'
        }
      });
    });

    res.json({ success: true, message: `Payment recorded successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// PROFITABILITY ENGINE
// ==========================================

exports.getGlobalProfitability = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { businessId: req.business.id },
      include: {
        customer: true,
        projectManager: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = projects.map(p => {
      const revenue = p.revenue || 0;
      const cost = p.actualCost || 0;
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      let health = "Healthy";
      if (margin < 0) health = "Loss";
      else if (margin <= 15) health = "Critical";
      else if (margin <= 30) health = "Warning";

      return {
        ...p,
        revenue,
        cost,
        profit,
        margin: parseFloat(margin.toFixed(2)),
        health
      };
    });

    res.json({ success: true, projects: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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

const getResourceList = async (businessId) => {
  const businessUsers = await prisma.businessUser.findMany({
    where: {
      businessId: businessId,
      isActive: true,
    },
    include: {
      user: {
        include: {
          employees: true,
          resourceAllocations: {
            where: { businessId: businessId, status: 'Active' },
            include: { project: { select: { id: true, projectName: true, status: true } } }
          }
        }
      },
      role: true
    }
  });

  return businessUsers.map(bu => {
    const u = bu.user;
    if (!u) return null;
    const emp = u.employees;

    const allocations = u.resourceAllocations || [];
    const totalAssignedHours = allocations.reduce((sum, alloc) => sum + (alloc.estimatedHours || 0), 0);

    const availableHours = 160;
    const utilization = (totalAssignedHours / availableHours) * 100;

    let availability = "Available";
    if (utilization > 100) availability = "Overallocated";
    else if (utilization >= 81) availability = "Busy";
    else if (utilization < 40) availability = "Underutilized";

    const activeProjectsSet = new Set();
    allocations.forEach(alloc => {
      if (alloc.project && alloc.project.status === 'ACTIVE') {
        activeProjectsSet.add(alloc.project.projectName);
      }
    });

    return {
      id: u.id,
      businessUserId: bu.id,
      name: u.name,
      code: emp?.Code || '-',
      department: emp?.department || '-',
      designation: emp?.designation || '-',
      role: bu.role?.name || '-',
      currentWorkload: totalAssignedHours,
      projects: activeProjectsSet.size,
      projectNames: Array.from(activeProjectsSet),
      utilization: Math.round(utilization),
      availability: availability,
    };
  }).filter(Boolean);
};

exports.getResourceUtilization = async (req, res) => {
  try {
    const resources = await getResourceList(req.business.id);
    res.json({ success: true, resources });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createResourceAllocation = async (req, res) => {
  try {
    const data = req.body;

    const allocation = await prisma.resourceAllocation.create({
      data: {
        businessId: req.business.id,
        projectId: data.projectId,
        taskId: data.taskId || null,
        employeeId: data.employeeId,
        department: data.department,
        role: data.role,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        estimatedHours: parseFloat(data.estimatedHours || 0),
        allocationPercent: parseFloat(data.allocationPercent || 100),
        priority: data.priority,
        notes: data.notes,
        status: 'Active'
      }
    });

    if (data.taskId && data.employeeId) {
      await prisma.projectTask.update({
        where: { id: data.taskId },
        data: { assignedToId: data.employeeId }
      });
    }

    res.json({ success: true, allocation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// EXPORTS
exports.exportResourceExcel = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    let resources = await getResourceList(req.business.id);
    const { search, department, role, availability, project, utilizationRange } = req.query;

    resources = resources.filter(res => {
      const searchLower = (search || '').toLowerCase();
      const matchesSearch = !search ||
        (res.name || '').toLowerCase().includes(searchLower) ||
        (res.code || '').toLowerCase().includes(searchLower) ||
        (res.department || '').toLowerCase().includes(searchLower) ||
        (res.role || '').toLowerCase().includes(searchLower) ||
        (res.projectNames || []).some(p => p.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;
      if (department && res.department !== department) return false;
      if (role && res.role !== role) return false;
      if (availability && res.availability !== availability) return false;
      if (project && !(res.projectNames || []).includes(project)) return false;
      if (utilizationRange) {
        const u = res.utilization;
        if (utilizationRange === '0-40%' && u > 40) return false;
        if (utilizationRange === '41-80%' && (u <= 40 || u > 80)) return false;
        if (utilizationRange === '81-100%' && (u <= 80 || u > 100)) return false;
        if (utilizationRange === '>100%' && u <= 100) return false;
      }
      return true;
    });

    let exportData = [];
    if (resources.length === 0) {
      exportData = [{ Message: "No resource data available." }];
    } else {
      exportData = resources.map(r => ({
        "Employee Name": r.name,
        "Employee Code": r.code,
        "Department": r.department,
        "Designation": r.designation,
        "Role": r.role,
        "Current Workload (Hrs)": r.currentWorkload,
        "Active Projects": r.projects,
        "Utilization %": r.utilization,
        "Availability Status": r.availability,
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resources");
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Resource_Planning_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportResourcePDF = async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    let resources = await getResourceList(req.business.id);
    const { search, department, role, availability, project, utilizationRange } = req.query;

    resources = resources.filter(res => {
      const searchLower = (search || '').toLowerCase();
      const matchesSearch = !search ||
        (res.name || '').toLowerCase().includes(searchLower) ||
        (res.code || '').toLowerCase().includes(searchLower) ||
        (res.department || '').toLowerCase().includes(searchLower) ||
        (res.role || '').toLowerCase().includes(searchLower) ||
        (res.projectNames || []).some(p => p.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;
      if (department && res.department !== department) return false;
      if (role && res.role !== role) return false;
      if (availability && res.availability !== availability) return false;
      if (project && !(res.projectNames || []).includes(project)) return false;
      if (utilizationRange) {
        const u = res.utilization;
        if (utilizationRange === '0-40%' && u > 40) return false;
        if (utilizationRange === '41-80%' && (u <= 40 || u > 80)) return false;
        if (utilizationRange === '81-100%' && (u <= 80 || u > 100)) return false;
        if (utilizationRange === '>100%' && u <= 100) return false;
      }
      return true;
    });

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Resource_Planning_${new Date().toISOString().split('T')[0]}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('Resource Planning Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1.5);

    // Check if there's any data
    if (resources.length === 0) {
      doc.fontSize(12).text("No resource data available.", { align: 'center' });
      doc.end();
      return;
    }

    // A very simple table layout for PDFKit since we don't have jspdf-autotable on backend
    const tableTop = doc.y;
    const colWidths = [120, 60, 100, 100, 60, 80, 100];
    const headers = ['Employee', 'Code', 'Department', 'Role', 'Projects', 'Utilization', 'Status'];

    let currentX = 30;
    doc.font('Helvetica-Bold').fontSize(10);
    headers.forEach((h, i) => {
      doc.text(h, currentX, tableTop, { width: colWidths[i] });
      currentX += colWidths[i] + 10;
    });

    let currentY = tableTop + 20;
    doc.font('Helvetica').fontSize(9);

    resources.forEach(r => {
      if (currentY > 500) {
        doc.addPage();
        currentY = 30;
      }
      currentX = 30;
      const row = [r.name, r.code, r.department, r.role, String(r.projects), `${r.utilization}%`, r.availability];
      row.forEach((text, i) => {
        doc.text(text, currentX, currentY, { width: colWidths[i] });
        currentX += colWidths[i] + 10;
      });
      currentY += 20;
    });

    doc.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// ==========================================
// MASTERS (Lookup Config)
// ==========================================

exports.getMasters = async (req, res) => {
  try {
    const { type } = req.query;
    const where = { businessId: req.business.id };
    if (type) where.type = type;

    const masters = await prisma.projectMaster.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }]
    });
    res.json({ success: true, masters });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createMaster = async (req, res) => {
  try {
    const { type, name, description, config } = req.body;
    if (!type || !name) return res.status(400).json({ success: false, message: 'type and name are required' });

    const master = await prisma.projectMaster.create({
      data: { businessId: req.business.id, type, name, description, config }
    });
    res.json({ success: true, master });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.projectMaster.findFirst({ where: { id, businessId: req.business.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    const master = await prisma.projectMaster.update({ where: { id }, data: req.body });
    res.json({ success: true, master });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.projectMaster.findFirst({ where: { id, businessId: req.business.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    await prisma.projectMaster.delete({ where: { id } });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// DOCUMENTS
// ==========================================

exports.getDocuments = async (req, res) => {
  try {
    const { search, folder, entityType, fileType, projectId } = req.query;
    const where = { businessId: req.business.id, isArchived: false };
    if (folder) where.folder = folder;
    if (entityType) where.entityType = entityType;
    if (projectId) where.projectId = projectId;
    if (fileType) where.fileType = { contains: fileType, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const documents = await prisma.projectDocument.findMany({
      where,
      include: {
        project: { select: { projectName: true, projectCode: true, id: true } },
        uploadedBy: { select: { name: true, id: true } },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 5 }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const totalDocs = await prisma.projectDocument.count({ where: { businessId: req.business.id, isArchived: false } });
    const totalSize = await prisma.projectDocument.aggregate({
      where: { businessId: req.business.id, isArchived: false },
      _sum: { fileSize: true }
    });

    res.json({ 
      success: true, 
      documents,
      stats: { totalDocs, totalSize: totalSize._sum.fileSize || 0 }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createDocument = async (req, res) => {
  try {
    const { title, fileUrl, fileType, fileSize, mimeType, folder, entityType, entityId, projectId, description, tags, permission } = req.body;
    if (!title || !fileUrl) return res.status(400).json({ success: false, message: 'title and fileUrl are required' });

    const doc = await prisma.projectDocument.create({
      data: {
        businessId: req.business.id,
        title, fileUrl, fileType, fileSize, mimeType,
        folder: folder || 'General',
        entityType, entityId, projectId,
        description,
        tags: tags || [],
        permission: permission || 'Owner',
        uploadedById: req.user?.id
      }
    });

    await prisma.documentAuditLog.create({
      data: {
        businessId: req.business.id,
        documentId: doc.id,
        action: 'Uploaded',
        performedBy: req.user?.id || req.user?.name || 'System'
      }
    });

    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.projectDocument.findFirst({ where: { id, businessId: req.business.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Document not found' });

    const doc = await prisma.projectDocument.update({ where: { id }, data: req.body });

    await prisma.documentAuditLog.create({
      data: {
        businessId: req.business.id,
        documentId: doc.id,
        action: req.body.isArchived ? 'Archived' : 'Updated',
        performedBy: req.user?.id || 'System'
      }
    });

    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.projectDocument.findFirst({ where: { id, businessId: req.business.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Document not found' });

    await prisma.documentAuditLog.create({
      data: {
        businessId: req.business.id,
        documentId: id,
        action: 'Deleted',
        performedBy: req.user?.id || 'System'
      }
    });

    await prisma.projectDocument.delete({ where: { id } });
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addDocumentAudit = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const existing = await prisma.projectDocument.findFirst({ where: { id, businessId: req.business.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    // Increment view/download count
    const update = {};
    if (action === 'Viewed') update.viewCount = { increment: 1 };
    if (action === 'Downloaded') update.downloadCount = { increment: 1 };
    if (Object.keys(update).length) await prisma.projectDocument.update({ where: { id }, data: update });

    await prisma.documentAuditLog.create({
      data: {
        businessId: req.business.id,
        documentId: id,
        action,
        performedBy: req.user?.id || 'System'
      }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// REPORTS ENGINE
// ==========================================

exports.getReportSummary = async (req, res) => {
  try {
    const { reportType, startDate, endDate, projectId, customerId, status } = req.query;
    const bId = req.business.id;

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    let data = {};

    if (reportType === 'projects' || !reportType) {
      const projects = await prisma.project.findMany({
        where: { businessId: bId, ...(status ? { status } : {}), ...(customerId ? { customerId } : {}), ...(projectId ? { id: projectId } : {}) },
        include: { customer: true, projectManager: true },
        orderBy: { createdAt: 'desc' }
      });
      data.projects = projects.map(p => ({
        id: p.id, name: p.projectName, code: p.projectCode, status: p.status,
        customer: p.customer?.name, manager: p.projectManager?.name,
        budget: p.budget, revenue: p.collectedRevenue, cost: p.actualCost,
        profit: (p.collectedRevenue || 0) - (p.actualCost || 0),
        margin: p.collectedRevenue > 0 ? (((p.collectedRevenue - p.actualCost) / p.collectedRevenue) * 100).toFixed(1) : 0,
        startDate: p.startDate, endDate: p.endDate
      }));
    }

    if (reportType === 'expenses') {
      const expenses = await prisma.expense.findMany({
        where: { businessId: bId, ...(projectId ? { projectId } : {}), ...(status ? { status } : {}), ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}) },
        include: { project: true, employee: true, vendor: true },
        orderBy: { createdAt: 'desc' }
      });
      data.expenses = expenses;
    }

    if (reportType === 'billing') {
      const invoices = await prisma.invoice.findMany({
        where: { businessId: bId, isDeleted: false, ...(customerId ? { customerId } : {}), ...(status ? { status } : {}) },
        include: { customer: true, project: true, payments: true },
        orderBy: { createdAt: 'desc' }
      });
      data.invoices = invoices;
    }

    if (reportType === 'timesheets') {
      const entries = await prisma.timeEntry.findMany({
        where: { businessId: bId, ...(projectId ? { projectId } : {}), ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}) },
        include: { project: true, employee: true, task: true },
        orderBy: { date: 'desc' }
      });
      data.timeEntries = entries;
    }

    if (reportType === 'issues') {
      const issues = await prisma.projectIssue.findMany({
        where: { businessId: bId, ...(projectId ? { projectId } : {}), ...(status ? { status } : {}) },
        include: { project: true },
        orderBy: { createdAt: 'desc' }
      });
      data.issues = issues;
    }

    // Dashboard summary always included
    const [projectCount, openIssues, totalExpenses, paidInvoices] = await Promise.all([
      prisma.project.count({ where: { businessId: bId } }),
      prisma.projectIssue.count({ where: { businessId: bId, status: { not: 'Closed' } } }),
      prisma.expense.aggregate({ where: { businessId: bId }, _sum: { amount: true } }),
      prisma.invoice.aggregate({ where: { businessId: bId, status: 'PAID', isDeleted: false }, _sum: { grandTotal: true } })
    ]);

    data.summary = {
      projectCount,
      openIssues,
      totalExpenses: totalExpenses._sum.amount || 0,
      collectedRevenue: paidInvoices._sum.grandTotal || 0
    };

    res.json({ success: true, data, reportType: reportType || 'dashboard' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// PROJECT PLANNING / SCHEDULE MODULE
// ==========================================

exports.createPlanning = async (req, res) => {
  try {
    const planCount = await prisma.projectPlanning.count({ where: { businessId: req.business.id } });
    const planCode = `PLN-${String(planCount + 1).padStart(5, '0')}`;

    const {
      projectId, planName, phase, sprint, execType, status, priority, description,
      startDate, endDate, expectedCompletion, duration, workingDays, milestone, dependency,
      projectManagerId, taskOwnerId, department, resources, estimatedHours, billableHours, resourceCost,
      taskTitle, subTask, sequence, criticalTask, recurring, reminder,
      initialProgress, currentProgress, completionPercentage, progressStatus, riskLevel,
      estimatedCost, actualCost, variance, currency,
      comments, privateNotes, approvals
    } = req.body;

    if (!projectId || !planName || !startDate) {
      return res.status(400).json({ success: false, message: 'projectId, planName, and startDate are required.' });
    }

    const planning = await prisma.projectPlanning.create({
      data: {
        businessId: req.business.id,
        projectId,
        planCode,
        planName,
        phase: phase || null,
        sprint: sprint || null,
        execType: execType || null,
        status: status || 'DRAFT',
        priority: priority || null,
        description: description || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        expectedCompletion: expectedCompletion ? new Date(expectedCompletion) : null,
        duration: duration ? parseInt(duration) : null,
        workingDays: workingDays ? parseInt(workingDays) : null,
        milestone: milestone || null,
        dependency: dependency || null,
        projectManagerId: projectManagerId || null,
        department: department || null,
        taskOwnerId: taskOwnerId || null,
        resources: resources ? parseInt(resources) : null,
        estimatedHours: parseFloat(estimatedHours) || 0,
        billableHours: parseFloat(billableHours) || 0,
        resourceCost: parseFloat(resourceCost) || 0,
        taskTitle: taskTitle || null,
        subTask: subTask || null,
        sequence: sequence ? parseInt(sequence) : null,
        criticalTask: criticalTask === true || criticalTask === 'true',
        recurring: recurring === true || recurring === 'true',
        reminder: reminder ? parseInt(reminder) : null,
        initialProgress: parseFloat(initialProgress) || 0,
        currentProgress: parseFloat(currentProgress) || 0,
        completionPercentage: parseFloat(completionPercentage) || 0,
        progressStatus: progressStatus || null,
        riskLevel: riskLevel || null,
        estimatedCost: parseFloat(estimatedCost) || 0,
        actualCost: parseFloat(actualCost) || 0,
        variance: parseFloat(variance) || 0,
        currency: currency || null,
        comments: comments || null,
        privateNotes: privateNotes || null,
        approvals: approvals || null,
      },
      include: { project: { select: { projectName: true, projectCode: true } } }
    });

    res.status(201).json({ success: true, planning });
  } catch (err) {
    console.error('Create Planning Error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getPlannings = async (req, res) => {
  try {
    const { projectId } = req.query;
    const where = { businessId: req.business.id };
    if (projectId) where.projectId = projectId;

    const plannings = await prisma.projectPlanning.findMany({
      where,
      include: {
        project: { select: { projectName: true, projectCode: true, id: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, plannings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPlanningById = async (req, res) => {
  try {
    const planning = await prisma.projectPlanning.findFirst({
      where: { id: req.params.id, businessId: req.business.id },
      include: { project: true }
    });
    if (!planning) return res.status(404).json({ success: false, message: 'Planning not found.' });
    res.json({ success: true, planning });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePlanning = async (req, res) => {
  try {
    const planning = await prisma.projectPlanning.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, planning });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deletePlanning = async (req, res) => {
  try {
    await prisma.projectPlanning.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Planning deleted.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
