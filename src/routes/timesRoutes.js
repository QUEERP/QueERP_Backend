const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");

const Controller = require("../controllers/timetrackController");

router.post("/", auth, business, checkPermission("time", "create"), Controller.createTimeEntry);
router.get("/", auth, business, checkPermission("time", "read"), Controller.getTimeEntries);

module.exports = router;