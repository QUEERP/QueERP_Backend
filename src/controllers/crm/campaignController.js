const prisma = require("../../config/prisma");
const { buildPrismaQuery, getPaginationMeta, logAudit } = require("../../utils/crmHelper");

//////////////////////////////////////////////////////
// CREATE CAMPAIGN
//////////////////////////////////////////////////////
exports.createCampaign = async (req, res) => {
  try {
    const {
      name,
      type,
      status = "PLANNING",
      budget,
      actualCost,
      expectedRevenue,
      startDate,
      endDate,
      description,
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: "name and type are required fields",
      });
    }

    const campaign = await prisma.campaign.create({
      data: {
        businessId: req.business.id,
        name,
        type,
        status,
        budget: budget ? Number(budget) : null,
        actualCost: actualCost ? Number(actualCost) : null,
        expectedRevenue: expectedRevenue ? Number(expectedRevenue) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        description,
      },
    });

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "CREATE",
      moduleName: "Campaign",
      recordId: campaign.id,
      details: { name: campaign.name, budget: campaign.budget },
    });

    res.status(201).json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error("createCampaign error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// GET ALL CAMPAIGNS (SEARCH, FILTER, PAGINATION)
//////////////////////////////////////////////////////
exports.getCampaigns = async (req, res) => {
  try {
    const { queryOptions, pagination } = buildPrismaQuery(req, {
      searchFields: ["name", "type", "description"],
      filterFields: {
        status: "status",
        type: "type",
      },
    });

    const totalCount = await prisma.campaign.count({ where: queryOptions.where });
    const campaigns = await prisma.campaign.findMany(queryOptions);

    res.json({
      success: true,
      data: campaigns,
      pagination: getPaginationMeta(totalCount, pagination.page, pagination.limit),
    });
  } catch (error) {
    console.error("getCampaigns error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// GET CAMPAIGN BY ID WITH DETAILED PERFORMANCE
//////////////////////////////////////////////////////
exports.getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, businessId: req.business.id, isDeleted: false },
      include: {
        leads: { where: { isDeleted: false } },
        deals: { where: { isDeleted: false }, include: { customer: true } },
      },
    });

    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    // Performance Calculations (ROI, won revenue, pipeline value)
    const pipelineValue = campaign.deals.reduce((sum, d) => sum + d.amount, 0);
    const wonRevenue = campaign.deals
      .filter((d) => d.stage === "Won" || d.status === "WON")
      .reduce((sum, d) => sum + d.amount, 0);

    const actualCampaignCost = campaign.actualCost || campaign.budget || 0;
    const roiPercentage = actualCampaignCost > 0 ? ((wonRevenue - actualCampaignCost) / actualCampaignCost) * 100 : 0;

    res.json({
      success: true,
      campaign,
      performance: {
        totalLeadsGenerated: campaign.leads.length,
        totalDealsGenerated: campaign.deals.length,
        pipelineValue,
        wonRevenue,
        roiPercentage: parseFloat(roiPercentage.toFixed(2)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// UPDATE CAMPAIGN
//////////////////////////////////////////////////////
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      budget,
      actualCost,
      expectedRevenue,
      startDate,
      endDate,
      ...rest
    } = req.body;

    const existing = await prisma.campaign.findFirst({
      where: { id, businessId: req.business.id, isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    const updatedData = {
      ...rest,
      ...(budget !== undefined && { budget: budget ? Number(budget) : null }),
      ...(actualCost !== undefined && { actualCost: actualCost ? Number(actualCost) : null }),
      ...(expectedRevenue !== undefined && { expectedRevenue: expectedRevenue ? Number(expectedRevenue) : null }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
    };

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updatedData,
    });

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "UPDATE",
      moduleName: "Campaign",
      recordId: id,
      details: updatedData,
    });

    res.json({
      success: true,
      message: "Campaign updated successfully",
      campaign,
    });
  } catch (error) {
    console.error("updateCampaign error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// SOFT DELETE CAMPAIGN
//////////////////////////////////////////////////////
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.campaign.updateMany({
      where: { id, businessId: req.business.id, isDeleted: false },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ success: false, message: "Campaign not found or already deleted" });
    }

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "DELETE_SOFT",
      moduleName: "Campaign",
      recordId: id,
    });

    res.json({
      success: true,
      message: "Campaign soft-deleted successfully",
    });
  } catch (error) {
    console.error("deleteCampaign error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
