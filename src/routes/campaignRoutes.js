const express = require("express");
const router = express.Router();
const campaignController = require("../controllers/campaignController");
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");

router.get("/", auth, business, campaignController.getCampaigns);
router.post("/", auth, business, campaignController.createCampaign);
router.put("/:id", auth, business, campaignController.updateCampaign);
router.delete("/:id", auth, business, campaignController.deleteCampaign);

module.exports = router;
