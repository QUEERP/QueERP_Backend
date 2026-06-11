const express = require("express");
const {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  generateInvoicePdf,
  downloadInvoicePdf,
  bulkUpdateInvoices,
  createInvoiceFromSalesOrder,
  convertSalesOrder,
  previewInvoice,
  changeStatus,
} = require("../controllers/invoiceController");
const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkBusinessSubscription = require("../middlewares/subscriptionMiddleware");
const checkPermission = require("../middlewares/checkPermission");

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// ── Read ───────────────────────────────────────────────────────────────────
router.get(
  "/",
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("invoice", "read"),
  getInvoices
);

router.get(
  "/:id",
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("invoice", "read"),
  getInvoiceById
);

// ── Create ─────────────────────────────────────────────────────────────────
router.post(
  "/",
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("invoice", "create"),
  createInvoice
);

// Preview invoice HTML (no DB write)
router.post(
  "/preview",
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("invoice", "create"),
  previewInvoice
);

// Convert Sales Order → Invoice (legacy workflow route)
router.post(
  "/convert/:salesOrderId",
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("invoice", "create"),
  createInvoiceFromSalesOrder
);

// Convert Sales Order → Invoice (service-layer route)
router.post(
  "/convert-so/:salesOrderId",
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("invoice", "create"),
  convertSalesOrder
);

// Bulk PDF regeneration
router.post(
  "/bulk-update",
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("invoice", "update"),
  bulkUpdateInvoices
);

// ── Update ─────────────────────────────────────────────────────────────────
router.patch(
  "/:id",
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("invoice", "update"),
  updateInvoice
);

// Change status
router.post(
  "/:id/status",
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("invoice", "update"),
  changeStatus
);

// Generate / regenerate PDF
router.post(
  "/:id/generate-pdf",
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("invoice", "update"),
  generateInvoicePdf
);

// ── Download ───────────────────────────────────────────────────────────────
router.get(
  "/:id/download-pdf",
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("invoice", "read"),
  downloadInvoicePdf
);

// ── Delete ─────────────────────────────────────────────────────────────────
router.delete(
  "/:id",
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("invoice", "delete"),
  deleteInvoice
);

module.exports = router;
