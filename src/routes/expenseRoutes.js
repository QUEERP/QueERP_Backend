const express = require("express");
const router = express.Router();

const expenseController = require("../controllers/expense");

const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkBusinessSubscription = require("../middlewares/subscriptionMiddleware");
const checkPermission = require("../middlewares/checkPermission");

//////////////////////////////////////////////////////
// CREATE EXPENSE
//////////////////////////////////////////////////////
router.post(
  "/",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Expense", "create"),
  expenseController.createExpense
);

//////////////////////////////////////////////////////
// GET ALL EXPENSES
//////////////////////////////////////////////////////
router.get(
  "/",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Expense", "view"),
  expenseController.getExpenses
);

//////////////////////////////////////////////////////
// GET SINGLE EXPENSE
//////////////////////////////////////////////////////
router.get(
  "/:id",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Expense", "view"),
  expenseController.getExpense
);

//////////////////////////////////////////////////////
// UPDATE EXPENSE
//////////////////////////////////////////////////////
router.patch(
  "/:id",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Expense", "update"),
  expenseController.updateExpense
);

//////////////////////////////////////////////////////
// DELETE EXPENSE
//////////////////////////////////////////////////////
router.delete(
  "/:id",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Expense", "delete"),
  expenseController.deleteExpense
);

module.exports = router;