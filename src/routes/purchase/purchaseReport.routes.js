const router = require("express").Router();
const auth = require("../../middlewares/authMiddleware");
const business = require("../../middlewares/business.middleware");
const Controller = require("../../controllers/purchase/purchaseReport.controller");

router.get("/summary", auth, business, Controller.getPurchaseSummary);
router.get("/by-vendor", auth, business, Controller.getPurchaseByVendor);
router.get("/bills-aging", auth, business, Controller.getBillsAging);
router.get("/grn-summary", auth, business, Controller.getGRNSummary);
router.get("/returns-summary", auth, business, Controller.getPurchaseReturnsSummary);

module.exports = router;
