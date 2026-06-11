const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");

const Controller = require("../controllers/projectController");

router.post("/", auth, business, checkPermission("project", "create"), Controller.createProject);
router.get("/", auth, business, Controller.getProjects);
router.get("/:id/summary", auth, business, Controller.getProjectSummary);
router.put("/:id", auth, business, checkPermission("project", "update"), Controller.updateProject);
router.delete("/:id", auth, business, checkPermission("project", "delete"), Controller.deleteProject);

module.exports = router;