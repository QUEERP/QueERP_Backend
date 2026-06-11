const express = require("express");
const router = express.Router();

const employeeController = require("../controllers/employeeController");
const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkBusinessSubscription = require("../middlewares/subscriptionMiddleware");
const checkPermission = require("../middlewares/checkPermission");

router.post(
  "/",
  authMiddleware,
    businessMiddleware,
    checkBusinessSubscription,
  checkPermission("Employee","create"),
  employeeController.createEmployee
);

router.get(
  "/",
  authMiddleware,
    businessMiddleware,
    checkBusinessSubscription,
  checkPermission("Employee","view"),
  employeeController.getAllEmployees
);

router.get(
  "/:id",
  authMiddleware,
    businessMiddleware,
    checkBusinessSubscription,
  checkPermission("Employee","view"),
  employeeController.getEmployee
);

router.put(
  "/:id",
  authMiddleware,
    businessMiddleware,
    checkBusinessSubscription,
  checkPermission("Employee","update"),
  employeeController.updateEmployee
);

router.delete(
  "/:id",
  authMiddleware,
    businessMiddleware,
    checkBusinessSubscription,
  checkPermission("Employee","delete"),
  employeeController.deleteEmployee
);

module.exports = router;