const router = require("express").Router();
const auth = require("../../middlewares/authMiddleware");
const business = require("../../middlewares/business.middleware");
const checkPermission = require("../../middlewares/checkPermission");
const Controller = require("../../controllers/purchase/bill.controller");

// Bills
router.post("/", auth, business, checkPermission("purchase", "create"), Controller.createBill);
router.get("/", auth, business, Controller.getBills);
router.get("/:id", auth, business, Controller.getBillById);

// Vendor Payments (nested under a bill)
router.post("/:billId/payments", auth, business, checkPermission("purchase", "create"), Controller.recordPayment);
router.get("/:billId/payments", auth, business, Controller.getPaymentsByBill);

module.exports = router;
