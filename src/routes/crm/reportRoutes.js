const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const businessMiddleware = require("../../middlewares/business.middleware");
const checkPermission = require("../../middlewares/checkPermission");

const {
  getFunnelReport,
  getForecastReport,
  getActivityStatsReport,
  getSalesPerformanceReport,
  getCampaignRoiReport,
} = require("../../controllers/crm/reportController");

router.use(authMiddleware);
router.use(businessMiddleware);

// FUNNEL CONVERSION
router.get(
  "/funnel",
  checkPermission("crm_report", "view"),
  getFunnelReport
);

// REVENUE FORECASTING
router.get(
  "/forecast",
  checkPermission("crm_report", "view"),
  getForecastReport
);

// ACTIVITY STATS
router.get(
  "/activities",
  checkPermission("crm_report", "view"),
  getActivityStatsReport
);

// SALES PERFORMANCE
router.get(
  "/sales-pipeline",
  checkPermission("crm_report", "view"),
  getSalesPerformanceReport
);

// CAMPAIGN ROI
router.get(
  "/campaigns-roi",
  checkPermission("crm_report", "view"),
  getCampaignRoiReport
);

module.exports = router;
