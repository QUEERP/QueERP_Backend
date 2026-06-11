const express = require("express");
const router = express.Router();
const crmTaskController = require("../controllers/crmTaskController");
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");

router.get("/", auth, business, crmTaskController.getCrmTasks);
router.post("/", auth, business, crmTaskController.createCrmTask);
router.put("/:id", auth, business, crmTaskController.updateCrmTask);
router.delete("/:id", auth, business, crmTaskController.deleteCrmTask);

module.exports = router;
