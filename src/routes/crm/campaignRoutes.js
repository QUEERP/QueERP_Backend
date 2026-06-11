const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const businessMiddleware = require("../../middlewares/business.middleware");
const checkPermission = require("../../middlewares/checkPermission");

const {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
} = require("../../controllers/crm/campaignController");

router.use(authMiddleware);
router.use(businessMiddleware);

// CREATE CAMPAIGN
router.post(
  "/",
  checkPermission("campaign", "create"),
  createCampaign
);

// GET ALL CAMPAIGNS
router.get(
  "/",
  checkPermission("campaign", "view"),
  getCampaigns
);

// GET SINGLE CAMPAIGN BY ID WITH DETAILED PERFORMANCE
router.get(
  "/:id",
  checkPermission("campaign", "view"),
  getCampaignById
);

// UPDATE CAMPAIGN
router.put(
  "/:id",
  checkPermission("campaign", "update"),
  updateCampaign
);

// DELETE CAMPAIGN
router.delete(
  "/:id",
  checkPermission("campaign", "delete"),
  deleteCampaign
);

module.exports = router;
