const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const Controller = require("../controllers/vendor");

router.post(
  "/",
  auth,
  business,
  checkPermission("vendor", "create"),
  Controller.createVendor
);

router.get(
  "/",
  auth,
  business,
  Controller.getVendors
);

router.get(
  "/:id",
  auth,
  business,

  Controller.getVendor
);

router.put(
  "/:id",
  auth,
  business,
  checkPermission("vendor", "update"),
  Controller.updateVendor
);

router.delete(
  "/:id",
  auth,
  business,
  checkPermission("vendor", "delete"),
  Controller.deleteVendor
);

module.exports = router;