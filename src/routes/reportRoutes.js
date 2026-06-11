const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");

const Controller = require("../controllers/reportController");

//////////////////////////////////////////////////////
// PROFIT & LOSS
//////////////////////////////////////////////////////
router.get(
  "/",
  auth,
  business,
  checkPermission("report", "read"),
  Controller.getProfitLoss
);

router.get(
  "/stock-valuation",
  auth,
  business,
  checkPermission("report", "read"),
  Controller.getStockValuation
);

router.get(
  "/low-stock-alerts",
  auth,
  business,
  checkPermission("report", "read"),
  Controller.getLowStockAlerts
);

router.get(
  "/movement-summary",
  auth,
  business,
  checkPermission("report", "read"),
  Controller.getMovementSummary
);

module.exports = router;