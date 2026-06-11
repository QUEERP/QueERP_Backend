const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const controller = require("../controllers/erpController");

// Product catalog entry with opening balance tracking
router.post(
  "/products",
  auth,
  business,
  checkPermission("product", "create"),
  controller.createProduct
);

// Auto-fetch SO details and convert into invoice under stock deduction
router.post(
  "/invoices/auto-fetch-so",
  auth,
  business,
  checkPermission("invoice", "create"),
  controller.createInvoiceFromSO
);

// Receive Goods (GRN) under PO workflow
router.post(
  "/purchase-orders/receive-goods",
  auth,
  business,
  checkPermission("purchase", "create"), // purchase permissions
  controller.receiveGoods
);

// Audit Movements timeline ledger
router.get(
  "/stock-movements",
  auth,
  business,
  checkPermission("stock", "read"),
  controller.getStockMovements
);

// Warehouse balances lists
router.get(
  "/warehouse-balances",
  auth,
  business,
  checkPermission("stock", "read"),
  controller.getWarehouseBalances
);

module.exports = router;
