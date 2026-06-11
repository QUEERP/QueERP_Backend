const prisma = require("../config/prisma");
const { buildPrismaQuery, getPaginationMeta, logAudit } = require("../utils/crmHelper");

const VALID_STAGES = [
  "New",
  "Contacted",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];

//////////////////////////////////////////////////////
// CREATE DEAL
//////////////////////////////////////////////////////
exports.createDeal = async (req, res) => {
  try {
    const {
      name,
      amount,
      currency = "INR",
      customerId,
      contactId,
      assignedToId,
      stage = "New",
      expectedCloseDate,
      probability,
      source,
      description,
      campaignId,
      status = "OPEN",
      lostReason,
    } = req.body;

    //////////////////////////////////////////////////////
    // REQUIRED FIELDS
    //////////////////////////////////////////////////////
    if (!name || !amount || !customerId) {
      return res.status(400).json({
        success: false,
        message: "name, amount and customerId are required",
      });
    }

    // Validate Stage
    if (!VALID_STAGES.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: "Invalid stage",
      });
    }

    // Validate Customer (Account)
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId: req.business.id, isDeleted: false },
    });
    if (!customer) {
      return res.status(400).json({
        success: false,
        message: "Customer Account not found",
      });
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

    // Validate Assigned User
    if (assignedToId) {
      const member = await prisma.businessUser.findFirst({
        where: {
          id: assignedToId,
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
    }

    // Validate Campaign
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

    // Resolve deal status based on stage
    let finalStatus = status;
    if (stage === "Won") finalStatus = "WON";
    if (stage === "Lost") finalStatus = "LOST";

    const deal = await prisma.deal.create({
      data: {
        businessId: req.business.id,
        name,
        amount: Number(amount),
        currency,
        customerId,
        contactId,
        assignedToId,
        stage,
        probability: probability !== undefined ? parseInt(probability) : null,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        source,
        description,
        campaignId,
        status: finalStatus,
        lostReason: stage === "Lost" ? lostReason : null,
      },
      include: {
        customer: true,
        contact: true,
        campaign: true,
        assignedTo: { include: { user: true } },
      },
    });

    // Write Stage History
    await prisma.dealStageHistory.create({
      data: {
        dealId: deal.id,
        fromStage: "None",
        toStage: stage,
        changedById: req.user.userId,
      },
    });

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "CREATE",
      moduleName: "Deal",
      recordId: deal.id,
      details: { name: deal.name, amount: deal.amount, stage: deal.stage },
    });

    res.status(201).json({
      success: true,
      deal,
    });
  } catch (error) {
    console.error("createDeal error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL DEALS (PAGINATION, FILTERS, SEARCH)
//////////////////////////////////////////////////////
exports.getDeals = async (req, res) => {
  try {
    const { queryOptions, pagination } = buildPrismaQuery(req, {
      searchFields: ["name", "source", "description"],
      filterFields: {
        customerId: "customerId",
        contactId: "contactId",
        assignedToId: "assignedToId",
        campaignId: "campaignId",
        stage: "stage",
        status: "status",
      },
      relations: {
        customer: true,
        contact: true,
        campaign: true,
        assignedTo: { include: { user: true } },
      },
    });

    const totalCount = await prisma.deal.count({ where: queryOptions.where });
    const deals = await prisma.deal.findMany(queryOptions);

    res.json({
      success: true,
      data: deals,
      pagination: getPaginationMeta(totalCount, pagination.page, pagination.limit),
    });
  } catch (error) {
    console.error("getDeals error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET SINGLE DEAL
//////////////////////////////////////////////////////
exports.getDealById = async (req, res) => {
  try {
    const { id } = req.params;

    const deal = await prisma.deal.findFirst({
      where: {
        id,
        businessId: req.business.id,
        isDeleted: false,
      },
      include: {
        customer: true,
        contact: true,
        campaign: true,
        stageHistory: { orderBy: { changedAt: "desc" } },
        notes: { where: { isDeleted: false }, orderBy: { createdAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" } },
        emailLogs: { orderBy: { sentAt: "desc" } },
        assignedTo: { include: { user: true } },
      },
    });

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
      });
    }

    res.json({
      success: true,
      deal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE DEAL
//////////////////////////////////////////////////////
exports.updateDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      stage,
      assignedToId,
      expectedCloseDate,
      campaignId,
      status,
      lostReason,
      ...rest
    } = req.body;

    const existing = await prisma.deal.findFirst({
      where: { id, businessId: req.business.id, isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
      });
    }

    // Validate Stage
    if (stage && !VALID_STAGES.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: "Invalid stage",
      });
    }

    // Validate Assignment
    if (assignedToId) {
      const member = await prisma.businessUser.findFirst({
        where: {
          id: assignedToId,
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
    }

    // Validate Campaign
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

    // Handle stage change history logging
    let stageChanged = false;
    let fromStage = existing.stage;
    let toStage = stage;

    let finalStatus = status;
    if (stage && stage !== existing.stage) {
      stageChanged = true;
      if (stage === "Won") finalStatus = "WON";
      if (stage === "Lost") finalStatus = "LOST";
      if (stage !== "Won" && stage !== "Lost") finalStatus = "OPEN";
    }

    const updatedData = {
      ...rest,
      ...(stage && { stage }),
      ...(assignedToId !== undefined && { assignedToId }),
      ...(expectedCloseDate && { expectedCloseDate: new Date(expectedCloseDate) }),
      ...(campaignId !== undefined && { campaignId }),
      ...(finalStatus && { status: finalStatus }),
      ...(lostReason !== undefined && { lostReason: stage === "Lost" || existing.stage === "Lost" ? lostReason : null }),
    };

    const deal = await prisma.deal.update({
      where: { id },
      data: updatedData,
      include: {
        customer: true,
        contact: true,
        campaign: true,
        assignedTo: { include: { user: true } },
      },
    });

    // Write Stage History if changed
    if (stageChanged) {
      await prisma.dealStageHistory.create({
        data: {
          dealId: id,
          fromStage,
          toStage,
          changedById: req.user.userId,
        },
      });
    }

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "UPDATE",
      moduleName: "Deal",
      recordId: id,
      details: updatedData,
    });

    res.json({
      success: true,
      deal,
    });
  } catch (error) {
    console.error("updateDeal error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// SOFT DELETE DEAL
//////////////////////////////////////////////////////
exports.deleteDeal = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.deal.updateMany({
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
        message: "Deal not found or already deleted",
      });
    }

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "DELETE_SOFT",
      moduleName: "Deal",
      recordId: id,
    });

    res.json({
      success: true,
      message: "Deal soft-deleted successfully",
    });
  } catch (error) {
    console.error("deleteDeal error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};