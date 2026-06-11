const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard");
const auth = require("../middlewares/authMiddleware");
const businessMiddleware = require ("../middlewares/business.middleware");

router.get("/", auth, businessMiddleware, dashboardController.getDashboardSummary);

module.exports = router;