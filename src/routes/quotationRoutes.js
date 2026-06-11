const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const Controller = require("../controllers/quotationController");

router.post(
  "/",
  auth,
  business,
  checkPermission("quotation", "create"),
  Controller.createQuotation
);

router.get(
  "/",
  auth,
  business,
  Controller.getQuotations
);

router.get(
  "/:id",
  auth,
  business,
  Controller.getQuotationById
);

router.put(
  "/:id",
  auth,
  business,
  checkPermission("quotation", "update"),
  Controller.updateQuotation
);

router.delete(
  "/:id",
  auth,
  business,
  checkPermission("quotation", "delete"),
  Controller.deleteQuotation
);

router.post(
  "/:id/approve",
  auth,
  business,
  checkPermission("quotation", "update"),
  Controller.approveQuotation
);

router.post(
  "/:id/reject",
  auth,
  business,
  checkPermission("quotation", "update"),
  Controller.rejectQuotation
);

module.exports = router;