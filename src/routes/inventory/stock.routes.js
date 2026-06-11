const router = require("express").Router();
const auth = require("../../middlewares/authMiddleware");
const business = require("../../middlewares/business.middleware");
const checkPermission = require("../../middlewares/checkPermission");
const Controller = require("../../controllers/inventory/stock.controller");

// Stock Levels
router.get("/levels", auth, business, Controller.getStockLevels);

// Stock Movements (audit ledger)
router.get("/movements", auth, business, Controller.getStockMovements);

// Adjustments
router.post("/adjustments", auth, business, checkPermission("stock", "create"), Controller.createStockAdjustment);
router.get("/adjustments", auth, business, Controller.getStockAdjustments);
router.get("/adjustments/:id", auth, business, Controller.getStockAdjustmentById);

// Transfers
router.post("/transfers", auth, business, checkPermission("stock", "create"), Controller.createStockTransfer);
router.get("/transfers", auth, business, Controller.getStockTransfers);
router.get("/transfers/:id", auth, business, Controller.getStockTransferById);
router.patch("/transfers/:id/status", auth, business, checkPermission("stock", "edit"), Controller.changeTransferStatus);

// Batches
router.post("/batches", auth, business, checkPermission("stock", "create"), Controller.createBatch);
router.get("/batches", auth, business, Controller.getBatches);
router.get("/batches/:id", auth, business, Controller.getBatchById);

// Serial Numbers
router.get("/serials", auth, business, Controller.getSerialNumbers);
router.get("/serials/:serialNumber", auth, business, Controller.getSerialNumber);

module.exports = router;
