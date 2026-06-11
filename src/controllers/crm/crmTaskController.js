const prisma = require("../../config/prisma");
const { buildPrismaQuery, getPaginationMeta, logAudit } = require("../../utils/crmHelper");

//////////////////////////////////////////////////////
// CREATE CRM TASK
//////////////////////////////////////////////////////
exports.createCrmTask = async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      reminderAt,
      leadId,
      dealId,
      customerId,
      contactId,
      assignedToId,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "title is required",
      });
    }

    // Verify entity linkages
    if (leadId) {
      const exists = await prisma.lead.findFirst({ where: { id: leadId, businessId: req.business.id, isDeleted: false } });
      if (!exists) return res.status(400).json({ success: false, message: "Lead not found" });
    }
    if (dealId) {
      const exists = await prisma.deal.findFirst({ where: { id: dealId, businessId: req.business.id, isDeleted: false } });
      if (!exists) return res.status(400).json({ success: false, message: "Deal not found" });
    }
    if (customerId) {
      const exists = await prisma.customer.findFirst({ where: { id: customerId, businessId: req.business.id, isDeleted: false } });
      if (!exists) return res.status(400).json({ success: false, message: "Customer Account not found" });
    }
    if (contactId) {
      const exists = await prisma.customerContact.findFirst({ where: { id: contactId, businessId: req.business.id, isDeleted: false } });
      if (!exists) return res.status(400).json({ success: false, message: "Contact not found" });
    }

    // Verify assignee if provided
    if (assignedToId) {
      const assigneeExists = await prisma.businessUser.findFirst({
        where: { id: assignedToId, businessId: req.business.id, isActive: true }
      });
      if (!assigneeExists) {
        return res.status(400).json({ success: false, message: "Assigned business user not found or inactive" });
      }
    }

    const task = await prisma.crmTask.create({
      data: {
        businessId: req.business.id,
        title,
        description: description || null,
        status: status || "PENDING",
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        reminderAt: reminderAt ? new Date(reminderAt) : null,
        leadId: leadId || null,
        dealId: dealId || null,
        customerId: customerId || null,
        contactId: contactId || null,
        assignedToId: assignedToId || null,
        createdById: req.user.employeeId || null, // Matches other CRM controllers mapping BusinessUser
      },
      include: {
        assignedTo: { include: { user: true } },
        createdBy: { include: { user: true } },
      },
    });

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "CREATE",
      moduleName: "CrmTask",
      recordId: task.id,
    });

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("createCrmTask error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// GET ALL CRM TASKS (WITH PAGINATION, FILTER, SEARCH)
//////////////////////////////////////////////////////
exports.getCrmTasks = async (req, res) => {
  try {
    const { queryOptions, pagination } = buildPrismaQuery(req, {
      searchFields: ["title", "description"],
      filterFields: {
        status: "status",
        priority: "priority",
        leadId: "leadId",
        dealId: "dealId",
        customerId: "customerId",
        contactId: "contactId",
        assignedToId: "assignedToId",
        createdById: "createdById",
      },
      relations: {
        assignedTo: { select: { id: true, user: { select: { name: true, email: true } } } },
        createdBy: { select: { id: true, user: { select: { name: true, email: true } } } },
      },
    });

    // Ensure soft delete is respected
    queryOptions.where = {
      ...queryOptions.where,
      isDeleted: false,
    };

    const totalCount = await prisma.crmTask.count({ where: queryOptions.where });
    const tasks = await prisma.crmTask.findMany(queryOptions);

    res.json({
      success: true,
      data: tasks,
      pagination: getPaginationMeta(totalCount, pagination.page, pagination.limit),
    });
  } catch (error) {
    console.error("getCrmTasks error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// UPDATE CRM TASK
//////////////////////////////////////////////////////
exports.updateCrmTask = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      reminderAt,
      assignedToId,
    } = req.body;

    const existing = await prisma.crmTask.findFirst({
      where: { id, businessId: req.business.id, isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "CRM Task not found",
      });
    }

    // Verify assignee if provided
    if (assignedToId) {
      const assigneeExists = await prisma.businessUser.findFirst({
        where: { id: assignedToId, businessId: req.business.id, isActive: true }
      });
      if (!assigneeExists) {
        return res.status(400).json({ success: false, message: "Assigned business user not found or inactive" });
      }
    }

    const updatedTask = await prisma.crmTask.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(reminderAt !== undefined && { reminderAt: reminderAt ? new Date(reminderAt) : null }),
        ...(assignedToId !== undefined && { assignedToId: assignedToId || null }),
      },
      include: {
        assignedTo: { include: { user: true } },
        createdBy: { include: { user: true } },
      },
    });

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "UPDATE",
      moduleName: "CrmTask",
      recordId: id,
    });

    res.json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    console.error("updateCrmTask error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// SOFT DELETE CRM TASK
//////////////////////////////////////////////////////
exports.deleteCrmTask = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.crmTask.updateMany({
      where: {
        id,
        businessId: req.business.id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: "CRM Task not found or already deleted",
      });
    }

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "DELETE_SOFT",
      moduleName: "CrmTask",
      recordId: id,
    });

    res.json({
      success: true,
      message: "CRM Task soft-deleted successfully",
    });
  } catch (error) {
    console.error("deleteCrmTask error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
