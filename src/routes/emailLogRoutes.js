const express = require("express");
const router = express.Router();
const emailLogController = require("../controllers/emailLogController");
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");

router.get("/", auth, business, emailLogController.getEmailLogs);
router.post("/", auth, business, emailLogController.createEmailLog);

module.exports = router;
