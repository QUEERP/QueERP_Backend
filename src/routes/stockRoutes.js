const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const Controller = require("../controllers/stockController");

router.post(
    "/",
    auth,
    business,
    checkPermission("stock", "create"),
    Controller.createStock
)

//////////////////////////////////////////////////
// GET STOCK
//////////////////////////////////////////////////
router.get(
  "/",
  auth,
  business,
  Controller.getStock
);

router.get(
  "/movements",
  auth,
  business,
  Controller.getMovements
);

router.post(
  "/adjustments",
  auth,
  business,
  Controller.createAdjustment
);

module.exports = router;