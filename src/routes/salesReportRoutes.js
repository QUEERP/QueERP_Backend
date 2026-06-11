const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const controller = require("../controllers/salesReportController");

router.get(
  "/dashboard",
  auth,
  businessMiddleware,
  checkPermission("invoice", "read"),
  controller.getSalesDashboard
);

module.exports = router;
