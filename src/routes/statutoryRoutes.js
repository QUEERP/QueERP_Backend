const express = require("express");
const router = express.Router();
const statutoryController = require("../controllers/statutoryController");
const auth = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");

// Get statutory dashboard summary
router.get("/dashboard", auth, businessMiddleware, statutoryController.getDashboardSummary);

module.exports = router;
