const prisma = require("../config/prisma");
const { buildPrismaQuery, getPaginationMeta, logAudit } = require("../utils/crmHelper");

const VALID_TYPES = ["CALL", "MEETING", "TASK", "EMAIL", "NOTE"];
const VALID_STATUS = ["Scheduled", "Completed", "Cancelled", "Deferred", "In Progress"];

//////////////////////////////////////////////////////
// CREATE ACTIVITY
//////////////////////////////////////////////////////
exports.createActivity = async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      leadId,
      dealId,
      customerId,
      contactId,
      assignedToId,
      activityDate,
      duration,
      status = "Scheduled",
      
      // CRM upgrades
      priority,
      dueDate,
      reminderAt,
      outcome,
      meetingLink,
      attendees,
      isAllDay = false,
    } = req.body;

    //////////////////////////////////////////////////////
    // VALIDATIONS
    //////////////////////////////////////////////////////
    if (!type || !title || !activityDate) {
      return res.status(400).json({
        success: false,
        message: "type, title and activityDate are required",
      });
    }

    const typeUpper = type.toUpperCase();
    if (!VALID_TYPES.includes(typeUpper)) {
      return res.status(400).json({
        success: false,
        message: `Invalid activity type. Allowed: ${VALID_TYPES.join(", ")}`,
      });
    }

    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Validate Assigned BusinessUser
    if (assignedToId) {
      const member = await prisma.businessUser.findFirst({
        where: { id: assignedToId, businessId: req.business.id, isActive: true },
      });
      if (!member) {
        return res.status(400).json({
          success: false,
          message: "Assigned user is inactive or does not belong to this business",
        });
      }
    }

    // Validate Contact (if provided)
    if (contactId) {
      const contact = await prisma.customerContact.findFirst({
        where: { id: contactId, businessId: req.business.id, isDeleted: false },
      });
      if (!contact) {
        return res.status(400).json({
          success: false,
          message: "Contact not found",
        });
      }
    }

    // Validate Customer (if provided)
    if (customerId) {
      const cust = await prisma.customer.findFirst({
        where: { id: customerId, businessId: req.business.id, isDeleted: false },
      });
      if (!cust) {
        return res.status(400).json({
          success: false,
          message: "Customer Account not found",
        });
      }
    }

    // Validate Lead (if provided)
    if (leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, businessId: req.business.id, isDeleted: false },
      });
      if (!lead) {
        return res.status(400).json({
          success: false,
          message: "Lead not found",
        });
      }
    }

    // Validate Deal (if provided)
    if (dealId) {
      const deal = await prisma.deal.findFirst({
        where: { id: dealId, businessId: req.business.id, isDeleted: false },
      });
      if (!deal) {
        return res.status(400).json({
          success: false,
          message: "Deal not found",
        });
      }
    }

    const activity = await prisma.activity.create({
      data: {
        businessId: req.business.id,
        type: typeUpper,
        title,
        description,
        leadId,
        dealId,
        customerId,
        contactId,
        assignedToId,
        activityDate: new Date(activityDate),
        duration: duration ? parseInt(duration) : null,
        status,

        priority: priority ? priority.toUpperCase() : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        reminderAt: reminderAt ? new Date(reminderAt) : null,
        outcome,
        meetingLink,
        attendees: attendees || null,
        isAllDay: Boolean(isAllDay),
      },
      include: {
        lead: true,
        deal: true,
        customer: true,
        contact: true,
        assignedTo: { include: { user: true } },
      },
    });

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "CREATE",
      moduleName: "Activity",
      recordId: activity.id,
      details: { type: activity.type, title: activity.title },
    });

    res.status(201).json({
      success: true,
      activity,
    });
  } catch (error) {
    console.error("createActivity error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL ACTIVITIES (WITH SEARCH, DYNAMIC FILTER, PAGINATION)
//////////////////////////////////////////////////////
exports.getActivities = async (req, res) => {
  try {
    const { queryOptions, pagination } = buildPrismaQuery(req, {
      searchFields: ["title", "description", "outcome", "meetingLink"],
      filterFields: {
        type: "type",
        status: "status",
        priority: "priority",
        leadId: "leadId",
        dealId: "dealId",
        customerId: "customerId",
        contactId: "contactId",
        assignedToId: "assignedToId",
      },
      relations: {
        lead: true,
        deal: true,
        customer: true,
        contact: true,
        assignedTo: { include: { user: true } },
      },
    });

    // Ensure type filter matches in uppercase if passed in query
    if (req.query.type) {
      queryOptions.where.type = req.query.type.toUpperCase();
    }

    const totalCount = await prisma.activity.count({ where: queryOptions.where });
    const activities = await prisma.activity.findMany(queryOptions);

    res.json({
      success: true,
      data: activities,
      pagination: getPaginationMeta(totalCount, pagination.page, pagination.limit),
    });
  } catch (error) {
    console.error("getActivities error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET SINGLE ACTIVITY
//////////////////////////////////////////////////////
exports.getActivityById = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await prisma.activity.findFirst({
      where: {
        id,
        businessId: req.business.id,
        isDeleted: false,
      },
      include: {
        lead: true,
        deal: true,
        customer: true,
        contact: true,
        assignedTo: { include: { user: true } },
      },
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    res.json({
      success: true,
      activity,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE ACTIVITY
//////////////////////////////////////////////////////
exports.updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      status,
      assignedToId,
      activityDate,
      dueDate,
      reminderAt,
      priority,
      ...rest
    } = req.body;

    const existing = await prisma.activity.findFirst({
      where: { id, businessId: req.business.id, isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    // Validate type
    let typeUpper = undefined;
    if (type) {
      typeUpper = type.toUpperCase();
      if (!VALID_TYPES.includes(typeUpper)) {
        return res.status(400).json({
          success: false,
          message: "Invalid activity type",
        });
      }
    }

    // Validate status
    if (status && !VALID_STATUS.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Validate Assigned BusinessUser
    if (assignedToId) {
      const member = await prisma.businessUser.findFirst({
        where: { id: assignedToId, businessId: req.business.id, isActive: true },
      });
      if (!member) {
        return res.status(400).json({
          success: false,
          message: "Assigned user is invalid or inactive",
        });
      }
    }

    const updatedData = {
      ...rest,
      ...(typeUpper && { type: typeUpper }),
      ...(status && { status }),
      ...(assignedToId !== undefined && { assignedToId }),
      ...(activityDate && { activityDate: new Date(activityDate) }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(reminderAt !== undefined && { reminderAt: reminderAt ? new Date(reminderAt) : null }),
      ...(priority !== undefined && { priority: priority ? priority.toUpperCase() : null }),
    };

    const activity = await prisma.activity.update({
      where: { id },
      data: updatedData,
      include: {
        lead: true,
        deal: true,
        customer: true,
        contact: true,
        assignedTo: { include: { user: true } },
      },
    });

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "UPDATE",
      moduleName: "Activity",
      recordId: id,
      details: updatedData,
    });

    res.json({
      success: true,
      activity,
    });
  } catch (error) {
    console.error("updateActivity error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// SOFT DELETE ACTIVITY
//////////////////////////////////////////////////////
exports.deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.activity.updateMany({
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
        message: "Activity not found or already deleted",
      });
    }

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "DELETE_SOFT",
      moduleName: "Activity",
      recordId: id,
    });

    res.json({
      success: true,
      message: "Activity soft-deleted successfully",
    });
  } catch (error) {
    console.error("deleteActivity error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};