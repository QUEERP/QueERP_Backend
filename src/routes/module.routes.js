const router = require("express").Router();

const authMiddleware = require("../middlewares/authMiddleware");
const subscriptionAdminOnly = require("../middlewares/subscriptionAdminOnly");

const moduleController = require("../controllers/module.controller");

//////////////////////////////////////////////////////
// MODULE CRUD (SUBSCRIPTION ADMIN ONLY)
//////////////////////////////////////////////////////

router.post(
  "/",
  authMiddleware,
  subscriptionAdminOnly,
  moduleController.createModule
);

router.get(
  "/",
  authMiddleware,
  moduleController.getModules
);

router.put(
  "/:id",
  authMiddleware,
  subscriptionAdminOnly,
  moduleController.updateModule
);

router.delete(
  "/:id",
  authMiddleware,
  subscriptionAdminOnly,
  moduleController.deleteModule
);

module.exports = router;