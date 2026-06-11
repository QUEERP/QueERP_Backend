const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const businessMiddleware = require("../../middlewares/business.middleware");
const checkPermission = require("../../middlewares/checkPermission");

const {
  createCrmTask,
  getCrmTasks,
  updateCrmTask,
  deleteCrmTask,
} = require("../../controllers/crm/crmTaskController");

router.use(authMiddleware);
router.use(businessMiddleware);

// CREATE TASK
router.post(
  "/",
  checkPermission("Tasks", "create"),
  createCrmTask
);

// GET ALL TASKS
router.get(
  "/",
  checkPermission("Tasks", "view"),
  getCrmTasks
);

// UPDATE TASK
router.put(
  "/:id",
  checkPermission("Tasks", "update"),
  updateCrmTask
);

// DELETE TASK
router.delete(
  "/:id",
  checkPermission("Tasks", "delete"),
  deleteCrmTask
);

module.exports = router;
