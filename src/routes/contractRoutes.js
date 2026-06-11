const router = require("express").Router();

const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");

const {
  createContract,
  getContracts,
  updateContract,
  deleteContract
} = require("../controllers/contractController");

//////////////////////////////////////////////////////
// CREATE
//////////////////////////////////////////////////////
router.post(
  "/",
  authMiddleware,
  businessMiddleware,
  checkPermission("contract", "create"),
  createContract
);

//////////////////////////////////////////////////////
// GET ALL
//////////////////////////////////////////////////////
router.get(
  "/",
  authMiddleware,
  businessMiddleware,
  checkPermission("contract", "read"),
  getContracts
);

//////////////////////////////////////////////////////
// UPDATE
//////////////////////////////////////////////////////
router.put(
  "/:id",
  authMiddleware,
  businessMiddleware,
  checkPermission("contract", "update"),
  updateContract
);

//////////////////////////////////////////////////////
// DELETE
//////////////////////////////////////////////////////
router.delete(
  "/:id",
  authMiddleware,
  businessMiddleware,
  checkPermission("contract", "delete"),
  deleteContract
);

module.exports = router;