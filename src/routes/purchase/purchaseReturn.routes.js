const router = require("express").Router();
const auth = require("../../middlewares/authMiddleware");
const business = require("../../middlewares/business.middleware");
const checkPermission = require("../../middlewares/checkPermission");
const Controller = require("../../controllers/purchase/purchaseReturn.controller");

router.post("/", auth, business, checkPermission("purchase", "create"), Controller.createPurchaseReturn);
router.get("/", auth, business, Controller.getPurchaseReturns);
router.get("/:id", auth, business, Controller.getPurchaseReturnById);

module.exports = router;
