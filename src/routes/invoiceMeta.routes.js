const express = require("express");
const router = express.Router();

const { getTaxFields } = require("../controllers/invoiceMeta.controller");
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");

router.get("/tax-fields", auth, business, getTaxFields);

module.exports = router;