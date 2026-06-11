const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const Controller = require("../controllers/ActivityController");

router.post(
  "/",
  auth,
  business,
  checkPermission("activity", "create"),
  Controller.createActivity
);

router.get(
  "/",
  auth,
  business,
  Controller.getActivities
);

router.get(
  "/:id",
  auth,
  business,
  Controller.getActivityById
);

router.put(
  "/:id",
  auth,
  business,
  checkPermission("activity", "update"),
  Controller.updateActivity
);

router.delete(
  "/:id",
  auth,
  business,
  checkPermission("activity", "delete"),
  Controller.deleteActivity
);

module.exports = router;