const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const controller = require("../controllers/salesReturnController");

router.post(
  "/",
  auth,
  businessMiddleware,
  checkPermission("invoice", "create"), // Align with billing permissions
  controller.createSalesReturn
);

router.get(
  "/",
  auth,
  businessMiddleware,
  checkPermission("invoice", "read"),
  controller.getSalesReturns
);

router.get(
  "/:id",
  auth,
  businessMiddleware,
  checkPermission("invoice", "read"),
  controller.getSalesReturnById
);

module.exports = router;
