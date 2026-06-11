const express = require("express");
const {
  getBusinessUsers,
  inviteUser,
  toggleUserStatus,
  assignDirectPermission,
  cancelInvite,
} = require("../controllers/userManagementController");

const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");

const router = express.Router();

router.use(authMiddleware);
router.use(businessMiddleware);

router.get("/", checkPermission("user", "read"), getBusinessUsers);


router.post("/invite", checkPermission("user", "create"), inviteUser);

router.patch(
  "/:membershipId/status",
  checkPermission("user", "update"),
  toggleUserStatus
);

router.post(
  "/:membershipId/permissions",
  checkPermission("user", "update"),
  assignDirectPermission
);
router.delete(
  "/invite/:membershipId",
  checkPermission("user", "delete"),
  cancelInvite
);


module.exports = router;
