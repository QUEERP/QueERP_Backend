const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const controller = require("../controllers/paymentController");

//////////////////////////////////////////////////
// CREATE PAYMENT (INVOICE - OLD)
//////////////////////////////////////////////////
router.post(
  "/:invoiceId",
  auth,
  business,
  checkPermission("payment", "create"),
  controller.createPayment
);

//////////////////////////////////////////////////
// 🔥 CREATE PAYMENT (BILL - NEW)
//////////////////////////////////////////////////
router.post(
  "/bill/:billId",
  auth,
  business,
  checkPermission("payment", "create"),
  controller.createPayment
);

//////////////////////////////////////////////////
// GET ALL PAYMENTS
//////////////////////////////////////////////////
router.get(
  "/",
  auth,
  business,
  checkPermission("payment", "read"),
  controller.getPayments
);

//////////////////////////////////////////////////
// READ PAYMENTS BY INVOICE
//////////////////////////////////////////////////
router.get(
  "/invoice/:invoiceId",   // ✅ FIXED (no conflict)
  auth,
  business,
  checkPermission("payment", "read"),
  controller.getInvoicePayments
);


//////////////////////////////////////////////////
// DOWNLOAD PAYMENT PDF
//////////////////////////////////////////////////
router.get(
  "/download/:paymentId",   // ✅ FIXED (no conflict)
  auth,
  business,
  checkPermission("payment", "read"),
  controller.downloadPaymentPdf
);

module.exports = router;