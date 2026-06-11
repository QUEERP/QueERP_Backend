const router = require("express").Router();
const controller = require("../controllers/permissionController");
const auth = require ("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");

router.post(
  "/assign/:userId",
  auth,
  businessMiddleware,
  controller.assignCrudPermissionsToUser
);

router.delete(
  "/remove/:userId",
  auth,
  businessMiddleware,
  controller.removeCrudPermissionsFromUser
);

router.get(
  "/user/:userId",
  auth,
  businessMiddleware,
  controller.getUserPermissions
);

module.exports = router;