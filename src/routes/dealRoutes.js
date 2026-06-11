const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const Controller = require("../controllers/dealController");

//////////////////////////////////////////////////////
// CREATE DEAL
//////////////////////////////////////////////////////
router.post(
  "/",
  auth,
  business,
  checkPermission("deal", "create"),
  Controller.createDeal
);

//////////////////////////////////////////////////////
// GET ALL DEALS
//////////////////////////////////////////////////////
router.get(
  "/",
  auth,
  business,
  Controller.getDeals
);

//////////////////////////////////////////////////////
// GET SINGLE DEAL
//////////////////////////////////////////////////////
router.get(
  "/:id",
  auth,
  business,
  Controller.getDealById
);

//////////////////////////////////////////////////////
// UPDATE DEAL
//////////////////////////////////////////////////////
router.put(
  "/:id",
  auth,
  business,
  checkPermission("deal", "update"),
  Controller.updateDeal
);

//////////////////////////////////////////////////////
// DELETE DEAL
//////////////////////////////////////////////////////
router.delete(
  "/:id",
  auth,
  business,
  checkPermission("deal", "delete"),
  Controller.deleteDeal
);

module.exports = router;