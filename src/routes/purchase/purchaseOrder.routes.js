const router = require("express").Router();
const auth = require("../../middlewares/authMiddleware");
const business = require("../../middlewares/business.middleware");
const checkPermission = require("../../middlewares/checkPermission");
const Controller = require("../../controllers/purchase/purchaseOrder.controller");

router.post("/", auth, business, checkPermission("purchase", "create"), Controller.createPurchaseOrder);
router.get("/", auth, business, Controller.getPurchaseOrders);
router.get("/:id", auth, business, Controller.getPurchaseOrderById);
router.put("/:id", auth, business, checkPermission("purchase", "edit"), Controller.updatePurchaseOrder);
router.patch("/:id/status", auth, business, checkPermission("purchase", "edit"), Controller.changePOStatus);

module.exports = router;
