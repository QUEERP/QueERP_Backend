const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const Controller = require("../controllers/BillController");

router.post("/", auth, business, checkPermission("bill", "create"), Controller.createBill);
router.get("/", auth, business,  Controller.getBills);
router.get("/:id", auth, business,  Controller.getBillById);
router.put("/:id", auth, business, checkPermission("bill", "update"), Controller.updateBill);
router.delete("/:id", auth, business, checkPermission("bill", "delete"), Controller.deleteBill);
module.exports = router;