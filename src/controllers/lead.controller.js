const prisma = require("../config/prisma");
const { buildPrismaQuery, getPaginationMeta, logAudit } = require("../utils/crmHelper");
const { convertLead } = require("../services/crm/leadConversionService");

//////////////////////////////////////////////////////
// CREATE LEAD
//////////////////////////////////////////////////////
exports.createLead = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      website,
      position,
      city,
      state,
      country,
      zipCode,
      status = "NEW",
      source,
      assignedTo, // Assumed assignedToId
      tags,
      leadValue = 0,
      description,
      isPublic = false,
      contactedToday = false,
      defaultLanguage = "SYSTEM",
      score = 0,
      campaignId,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    // Validate assignedTo BusinessUser
    let assignedToId = null;
    if (assignedTo) {
      const member = await prisma.businessUser.findFirst({
        where: {
          id: assignedTo,
          businessId: req.business.id,
          isActive: true,
        },
      });

      if (!member) {
        return res.status(400).json({
          success: false,
          message: "Assigned user not part of this business",
        });
      }
      assignedToId = assignedTo;
    }

    // Format tags
    let formattedTags = [];
    if (typeof tags === "string") {
      formattedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    } else if (Array.isArray(tags)) {
      formattedTags = tags;
    }

    // Validate campaign
    if (campaignId) {
      const camp = await prisma.campaign.findFirst({
        where: { id: campaignId, businessId: req.business.id, isDeleted: false },
      });
      if (!camp) {
        return res.status(400).json({
          success: false,
          message: "Campaign not found",
        });
      }
    }

    const lead = await prisma.lead.create({
      data: {
        businessId: req.business.id,
        name,
        email,
        phone,
        company,
        website,
        position,
        city,
        state,
        country,
        zipCode,
        status,
        source,
        assignedToId,
        tags: formattedTags,
        leadValue: Number(leadValue) || 0,
        description,
        isPublic: Boolean(isPublic),
        contactedToday: Boolean(contactedToday),
        defaultLanguage,
        score: parseInt(score) || 0,
        campaignId,
      },
      include: {
        assignedTo: { include: { user: true } },
        campaign: true,
      },
    });

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "CREATE",
      moduleName: "Lead",
      recordId: lead.id,
      details: { name: lead.name, status: lead.status },
    });

    res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    console.error("createLead error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL LEADS (WITH SEARCH, DYNAMIC FILTER, PAGINATION)
//////////////////////////////////////////////////////
exports.getAllLeads = async (req, res) => {
  try {
    const { queryOptions, pagination } = buildPrismaQuery(req, {
      searchFields: ["name", "email", "phone", "company", "website"],
      filterFields: {
        status: "status",
        source: "source",
        assignedToId: "assignedToId",
        campaignId: "campaignId",
      },
      relations: {
        stage: true,
        campaign: true,
        assignedTo: { include: { user: true } },
      },
    });

    const totalCount = await prisma.lead.count({ where: queryOptions.where });
    const leads = await prisma.lead.findMany(queryOptions);

    res.status(200).json({
      success: true,
      data: leads,
      pagination: getPaginationMeta(totalCount, pagination.page, pagination.limit),
    });
  } catch (error) {
    console.error("getAllLeads error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// GET LEAD DETAILS (BY ID)
//////////////////////////////////////////////////////
exports.getLeadDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findFirst({
      where: {
        id,
        businessId: req.business.id,
        isDeleted: false,
      },
      include: {
        stage: true,
        campaign: true,
        activities: { orderBy: { createdAt: "desc" } },
        notes: { where: { isDeleted: false }, orderBy: { createdAt: "desc" } },
        emailLogs: { orderBy: { sentAt: "desc" } },
        assignedTo: { include: { user: true } },
        conversionLog: true,
      },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// UPDATE LEAD
//////////////////////////////////////////////////////
exports.updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      assignedTo,
      tags,
      score,
      campaignId,
      ...rest
    } = req.body;

    const existing = await prisma.lead.findFirst({
      where: { id, businessId: req.business.id, isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Validate assignment
    let assignedToId = undefined;
    if (assignedTo) {
      const member = await prisma.businessUser.findFirst({
        where: { id: assignedTo, businessId: req.business.id, isActive: true },
      });
      if (!member) {
        return res.status(400).json({
          success: false,
          message: "Assigned user is invalid",
        });
      }
      assignedToId = assignedTo;
    }

    // Validate campaign
    if (campaignId) {
      const camp = await prisma.campaign.findFirst({
        where: { id: campaignId, businessId: req.business.id, isDeleted: false },
      });
      if (!camp) {
        return res.status(400).json({
          success: false,
          message: "Campaign not found",
        });
      }
    }

    // Format tags
    let formattedTags = undefined;
    if (tags) {
      if (typeof tags === "string") {
        formattedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      } else if (Array.isArray(tags)) {
        formattedTags = tags;
      }
    }

    const updatedData = {
      ...rest,
      ...(assignedTo !== undefined && { assignedToId }),
      ...(formattedTags && { tags: formattedTags }),
      ...(score !== undefined && { score: parseInt(score) || 0 }),
      ...(campaignId !== undefined && { campaignId }),
    };

    const lead = await prisma.lead.update({
      where: { id },
      data: updatedData,
      include: {
        assignedTo: { include: { user: true } },
      },
    });

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "UPDATE",
      moduleName: "Lead",
      recordId: id,
      details: updatedData,
    });

    res.json({
      success: true,
      message: "Lead updated successfully",
      data: lead,
    });
  } catch (error) {
    console.error("updateLead error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// SOFT DELETE LEAD
//////////////////////////////////////////////////////
exports.deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.lead.updateMany({
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
        message: "Lead not found or already deleted",
      });
    }

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "DELETE_SOFT",
      moduleName: "Lead",
      recordId: id,
    });

    res.json({
      success: true,
      message: "Lead soft-deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// LEAD CONVERSION ENGINE (PHASE 4 - TRANSACTION SAFE)
//////////////////////////////////////////////////////
exports.convertToCustomer = async (req, res) => {
  try {
    const leadId = req.params.id;
    const {
      createDeal = false,
      dealName,
      dealAmount,
      expectedCloseDate,
      dealStage,
      campaignId,
      existingAccountId,
      existingContactId,
    } = req.body;

    const result = await convertLead(req.business.id, req.user.userId, leadId, {
      createDeal,
      dealName,
      dealAmount,
      expectedCloseDate,
      dealStage,
      campaignId,
      existingAccountId,
      existingContactId,
    });

    res.json({
      success: true,
      message: "Lead converted successfully to enterprise account & primary contact.",
      data: result,
    });
  } catch (error) {
    console.error("convert error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// MOVE PIPELINE STAGE
//////////////////////////////////////////////////////
exports.moveStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stageId } = req.body;

    // Validate lead
    const lead = await prisma.lead.findFirst({
      where: { id, businessId: req.business.id, isDeleted: false },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Validate stageId if provided
    if (stageId) {
      const stage = await prisma.pipelineStage.findUnique({
        where: { id: stageId },
      });

      if (!stage) {
        return res.status(400).json({
          success: false,
          message: "Pipeline stage not found. Please create stages first from the pipeline settings.",
        });
      }
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: { stageId: stageId || null },
      include: { stage: true },
    });

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "MOVE_STAGE",
      moduleName: "Lead",
      recordId: id,
      details: { stageId },
    });

    res.json({ success: true, data: updatedLead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// REUSABLE LEAD NOTE / TASK / REMINDER ENDPOINTS
//////////////////////////////////////////////////////
exports.addActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const data = await prisma.leadActivity.create({
      data: { leadId: id, message },
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getActivities = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await prisma.leadActivity.findMany({
      where: { leadId: id },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const data = await prisma.leadNote.create({
      data: { leadId: id, note },
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const data = await prisma.leadTask.create({
      data: { leadId: id, title, status: "PENDING" },
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date } = req.body;

    const data = await prisma.leadReminder.create({
      data: { leadId: id, title, date: new Date(date) },
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// PIPELINE STAGE MANAGEMENT
//////////////////////////////////////////////////////
exports.getPipelineStages = async (req, res) => {
  try {
    const stages = await prisma.pipelineStage.findMany({
      orderBy: { order: "asc" },
    });
    res.json({ success: true, data: stages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createPipelineStage = async (req, res) => {
  try {
    const { name, color, order } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Stage name is required" });

    const count = await prisma.pipelineStage.count();
    const stage = await prisma.pipelineStage.create({
      data: {
        name,
        color: color || "#6366f1",
        order: order !== undefined ? Number(order) : count + 1,
      },
    });
    res.status(201).json({ success: true, data: stage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePipelineStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, order } = req.body;
    const stage = await prisma.pipelineStage.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(order !== undefined && { order: Number(order) }),
      },
    });
    res.json({ success: true, data: stage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deletePipelineStage = async (req, res) => {
  try {
    const { id } = req.params;
    // Safely unassign leads before deleting the stage
    await prisma.lead.updateMany({ where: { stageId: id }, data: { stageId: null } });
    await prisma.pipelineStage.delete({ where: { id } });
    res.json({ success: true, message: "Stage deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};