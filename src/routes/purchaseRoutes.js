const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");

// Controllers
const vendorController = require("../controllers/vendor");
const poController = require("../controllers/PO.Controller");
const billController = require("../controllers/BillController");
const erpController = require("../controllers/erpController");
const prController = require("../controllers/purchaseRequestController");

// Vendors
router.get("/vendors", auth, business, vendorController.getVendors);
router.post("/vendors", auth, business, checkPermission("vendor", "create"), vendorController.createVendor);
router.get("/vendors/:id", auth, business, vendorController.getVendor);
router.put("/vendors/:id", auth, business, checkPermission("vendor", "update"), vendorController.updateVendor);
router.delete("/vendors/:id", auth, business, checkPermission("vendor", "delete"), vendorController.deleteVendor);

// Purchase Requests
router.get("/requests", auth, business, prController.getPurchaseRequests);
router.post("/requests", auth, business, checkPermission("purchase_order", "create"), prController.createPurchaseRequest);
router.get("/requests/:id", auth, business, prController.getPurchaseRequestById);
router.put("/requests/:id", auth, business, checkPermission("purchase_order", "update"), prController.updatePurchaseRequest);

// Purchase Orders
router.get("/orders", auth, business, poController.getPurchaseOrders);
router.post("/orders", auth, business, checkPermission("purchase_order", "create"), poController.createPurchaseOrder);
router.get("/orders/:id", auth, business, poController.getPurchaseOrderById);
router.put("/orders/:id", auth, business, checkPermission("purchase_order", "update"), poController.updatePurchaseOrder);
router.delete("/orders/:id", auth, business, checkPermission("purchase_order", "delete"), poController.deletePurchaseOrder);
router.patch("/orders/:id/status", auth, business, checkPermission("purchase_order", "update"), poController.updatePurchaseOrder); // Simplified for changeStatus

// GRN (Goods Receive Note)
router.get("/grn", auth, business, erpController.getGRNs);
router.get("/grn/:id", auth, business, erpController.getGRNById);
router.delete("/grn/:id", auth, business, checkPermission("purchase", "delete"), erpController.deleteGRN);
router.post("/grn", auth, business, checkPermission("purchase", "create"), erpController.receiveGoods);

// Bills
router.get("/bills", auth, business, billController.getBills);
router.post("/bills", auth, business, checkPermission("bill", "create"), billController.createBill);
router.get("/bills/:id", auth, business, billController.getBillById);
router.put("/bills/:id", auth, business, checkPermission("bill", "update"), billController.updateBill);
router.delete("/bills/:id", auth, business, checkPermission("bill", "delete"), billController.deleteBill);

module.exports = router;
