const router = require("express").Router();
const auth = require("../../middlewares/authMiddleware");
const business = require("../../middlewares/business.middleware");
const checkPermission = require("../../middlewares/checkPermission");
const Controller = require("../../controllers/purchase/purchaseRequest.controller");

router.post("/", auth, business, checkPermission("purchase", "create"), Controller.createPurchaseRequest);
router.get("/", auth, business, Controller.getPurchaseRequests);
router.get("/:id", auth, business, Controller.getPurchaseRequestById);
router.put("/:id", auth, business, checkPermission("purchase", "edit"), Controller.updatePurchaseRequest);
router.post("/:id/convert-to-po", auth, business, checkPermission("purchase", "create"), Controller.convertToPurchaseOrder);

module.exports = router;
