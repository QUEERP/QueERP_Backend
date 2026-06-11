const prisma = require("../config/prisma");

exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { businessId: req.business.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const campaign = await prisma.campaign.create({
      data: {
        id: crypto.randomUUID(),
        ...req.body,
        businessId: req.business.id,
      },
    });
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const campaign = await prisma.campaign.updateMany({
      where: { id: req.params.id, businessId: req.business.id },
      data: req.body,
    });
    if (campaign.count === 0) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await prisma.campaign.deleteMany({
      where: { id: req.params.id, businessId: req.business.id },
    });
    if (campaign.count === 0) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }
    res.json({ success: true, message: "Campaign deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
