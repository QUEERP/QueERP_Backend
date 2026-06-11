const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const Controller = require("../controllers/PO.Controller");

router.post(
  "/",
  auth,
  business,
  checkPermission("purchase_order", "create"),
  Controller.createPurchaseOrder
);

router.get(
  "/",
  auth,
  business,
  Controller.getPurchaseOrders
);

router.get(
  "/:id",
  auth,
  business,

  Controller.getPurchaseOrderById
);

router.put(
  "/:id",
  auth,
  business,
  checkPermission("purchase_order", "update"),
  Controller.updatePurchaseOrder
);

router.post(
  "/:id/receive",
  auth,
  business,
  checkPermission("purchase_order", "update"),
  Controller.receiveGoods
);

router.delete(
  "/:id",
  auth,
  business,
  checkPermission("purchase_order", "delete"),
  Controller.deletePurchaseOrder
);

module.exports = router;