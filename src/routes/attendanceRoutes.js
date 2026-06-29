const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const Controller = require("../controllers/attendanceController");

router.get("/", auth, business, Controller.getLogs);
router.post("/mark", auth, business, Controller.markAttendance);

module.exports = router;
