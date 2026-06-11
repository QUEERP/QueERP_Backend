const router = require("express").Router();

const leaveController = require("../controllers/leaveController");
const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkBusinessSubscription = require("../middlewares/subscriptionMiddleware");
const checkPermission = require("../middlewares/checkPermission");

router.post("/", authMiddleware, businessMiddleware, checkBusinessSubscription, /*checkPermission("Leave","create"),*/ leaveController.createLeave);
router.get("/me", authMiddleware, businessMiddleware, checkBusinessSubscription, /*checkPermission("Leave","view"),*/ leaveController.getMyLeaves);
router.get("/", authMiddleware, businessMiddleware, checkBusinessSubscription, /*checkPermission("Leave","read"),*/ leaveController.getLeaves);
router.put(
  "/:id/status",
  authMiddleware,
  checkPermission("leave","update"),
  leaveController.updateLeaveStatus
);
module.exports = router;