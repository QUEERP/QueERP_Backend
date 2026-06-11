const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");

const Controller = require("../controllers/accountController");

//////////////////////////////////////////////////////
// CREATE ACCOUNT
//////////////////////////////////////////////////////
router.post(
  "/",
  auth,
  business,
  checkPermission("account", "create"),
  Controller.createAccount
);

//////////////////////////////////////////////////////
// GET ALL ACCOUNTS
//////////////////////////////////////////////////////
router.get(
  "/",
  auth,
  business,
  checkPermission("account", "read"),
  Controller.getAccounts
);

//////////////////////////////////////////////////////
// GET SINGLE ACCOUNT
//////////////////////////////////////////////////////
router.get(
  "/:id",
  auth,
  business,
  checkPermission("account", "read"),
  Controller.getAccount
);

//////////////////////////////////////////////////////
// UPDATE ACCOUNT
//////////////////////////////////////////////////////
router.put(
  "/:id",
  auth,
  business,
  checkPermission("account", "update"),
  Controller.updateAccount
);

//////////////////////////////////////////////////////
// DELETE ACCOUNT (SOFT DELETE)
//////////////////////////////////////////////////////
router.delete(
  "/:id",
  auth,
  business,
  checkPermission("account", "delete"),
  Controller.deleteAccount
);

//////////////////////////////////////////////////////
// CREATE DEFAULT ACCOUNTS
//////////////////////////////////////////////////////
router.post(
  "/default",
  auth,
  business,
  checkPermission("account", "create"),
  Controller.createDefaultAccounts
);

module.exports = router;