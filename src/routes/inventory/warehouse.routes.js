const router = require("express").Router();
const auth = require("../../middlewares/authMiddleware");
const business = require("../../middlewares/business.middleware");
const checkPermission = require("../../middlewares/checkPermission");
const Controller = require("../../controllers/inventory/warehouse.controller");

router.post("/", auth, business, checkPermission("warehouse", "create"), Controller.createWarehouse);
router.get("/", auth, business, Controller.getWarehouses);
router.get("/:id", auth, business, Controller.getWarehouseById);
router.put("/:id", auth, business, checkPermission("warehouse", "edit"), Controller.updateWarehouse);
router.delete("/:id", auth, business, checkPermission("warehouse", "delete"), Controller.deleteWarehouse);

module.exports = router;
