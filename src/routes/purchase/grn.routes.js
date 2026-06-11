const router = require("express").Router();
const auth = require("../../middlewares/authMiddleware");
const business = require("../../middlewares/business.middleware");
const checkPermission = require("../../middlewares/checkPermission");
const Controller = require("../../controllers/purchase/grn.controller");

router.post("/", auth, business, checkPermission("purchase", "create"), Controller.createGRN);
router.get("/", auth, business, Controller.getGRNs);
router.get("/:id", auth, business, Controller.getGRNById);

module.exports = router;
