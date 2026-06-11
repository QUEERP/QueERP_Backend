const router = require("express").Router();
const auth = require("../../middlewares/authMiddleware");
const business = require("../../middlewares/business.middleware");
const Controller = require("../../controllers/inventory/inventoryReport.controller");

router.get("/stock-valuation", auth, business, Controller.getStockValuation);
router.get("/low-stock-alerts", auth, business, Controller.getLowStockAlerts);
router.get("/movement-summary", auth, business, Controller.getMovementSummary);
router.get("/movement-detail", auth, business, Controller.getMovementDetail);
router.get("/expiring-batches", auth, business, Controller.getExpiringBatches);

module.exports = router;
