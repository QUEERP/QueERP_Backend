const express = require("express");
const router = express.Router();

const payrollController = require("../controllers/payrollController");

const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkBusinessSubscription = require("../middlewares/subscriptionMiddleware");
const checkPermission = require("../middlewares/checkPermission");

//////////////////////////////////////////////////////
// RUN PAYROLL
//////////////////////////////////////////////////////
router.post(
  "/run",
  authMiddleware,
    businessMiddleware,
    checkBusinessSubscription,
  checkPermission("Payroll", "create"),
  payrollController.runPayroll
);

//////////////////////////////////////////////////////
// GET ALL PAYROLLS
//////////////////////////////////////////////////////
router.get(
  "/",
  authMiddleware,
    businessMiddleware,
    checkBusinessSubscription,
  checkPermission("Payroll", "view"),
  payrollController.getPayrolls
);

//////////////////////////////////////////////////////
// GET SINGLE PAYROLL
//////////////////////////////////////////////////////
router.get(
  "/:id",
  authMiddleware,
    businessMiddleware,
    checkBusinessSubscription,
  checkPermission("Payroll", "view"),
  payrollController.getPayroll
);

//////////////////////////////////////////////////////
// MARK SALARY PAID
//////////////////////////////////////////////////////
router.patch(
  "/pay/:id",
  authMiddleware,
    businessMiddleware,
    checkBusinessSubscription,
  checkPermission("Payroll", "update"),
  payrollController.paySalary
);

//////////////////////////////////////////////////////
// DELETE PAYROLL
//////////////////////////////////////////////////////
router.delete(
  "/:id",
  authMiddleware,
    businessMiddleware,
    checkBusinessSubscription,
  checkPermission("Payroll", "delete"),
  payrollController.deletePayroll
);

module.exports = router;