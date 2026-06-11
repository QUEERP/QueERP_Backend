const express = require("express");
const router = express.Router();

const loanController = require("../controllers/loan");

const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkBusinessSubscription = require("../middlewares/subscriptionMiddleware");
const checkPermission = require("../middlewares/checkPermission");

//////////////////////////////////////////////////////
// CREATE LOAN
//////////////////////////////////////////////////////
router.post(
  "/",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Loans", "create"), // 🔥 permission
  loanController.createLoan
);

//////////////////////////////////////////////////////
// GET ALL LOANS
//////////////////////////////////////////////////////
router.get(
  "/",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Loans", "view"), // 🔥 permission
  loanController.getLoans
);

//////////////////////////////////////////////////////
// GET SINGLE LOAN
//////////////////////////////////////////////////////
router.get(
  "/:id",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Loans", "view"),
  loanController.getLoan
);

//////////////////////////////////////////////////////
// UPDATE LOAN
//////////////////////////////////////////////////////
router.patch(
  "/:id",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Loans", "update"),
  loanController.updateLoan
);

//////////////////////////////////////////////////////
// DELETE LOAN
//////////////////////////////////////////////////////
router.delete(
  "/:id",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Loans", "delete"),
  loanController.deleteLoan
);

module.exports = router;