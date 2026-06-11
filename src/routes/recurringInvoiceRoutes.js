const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const controller = require("../controllers/recurringInvoiceController");

router.post(
  "/",
  auth,
  businessMiddleware,
  checkPermission("invoice", "create"),
  controller.createProfile
);

router.get(
  "/",
  auth,
  businessMiddleware,
  checkPermission("invoice", "read"),
  controller.getProfiles
);

router.post(
  "/trigger-billing",
  auth,
  businessMiddleware,
  checkPermission("invoice", "create"),
  controller.triggerBillingJob
);

module.exports = router;
