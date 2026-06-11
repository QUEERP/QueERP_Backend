const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const Controller = require("../controllers/customerController");

router.post(
  "/",
  auth,
  business,
  checkPermission("customer", "create"),
  Controller.createCustomer
);

router.get(
  "/",
  auth,
  business,
  checkPermission("customer", "read"),
  Controller.getCustomers
);

router.put(
  "/:id",
  auth,
  business,
  checkPermission("customer", "update"),
  Controller.updateCustomer
);

router.delete(
  "/:id",
  auth,
  business,
  checkPermission("customer", "delete"),
  Controller.deleteCustomer
);

module.exports = router;