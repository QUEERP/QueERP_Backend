const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const businessMiddleware = require("../../middlewares/business.middleware");
const checkPermission = require("../../middlewares/checkPermission");

const {
  logEmail,
  getEmailLogs,
  updateEmailLogStatus,
} = require("../../controllers/crm/emailLogController");

router.use(authMiddleware);
router.use(businessMiddleware);

// LOG EMAIL
router.post(
  "/",
  checkPermission("email_log", "create"),
  logEmail
);

// GET EMAIL LOGS
router.get(
  "/",
  checkPermission("email_log", "view"),
  getEmailLogs
);

// UPDATE STATUS (E.G. OPEN TRACKING WEBHOOK)
router.put(
  "/:id/status",
  checkPermission("email_log", "update"),
  updateEmailLogStatus
);

module.exports = router;
