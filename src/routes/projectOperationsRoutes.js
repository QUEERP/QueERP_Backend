const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const Controller = require("../controllers/projectOperationsController");

// Middlewares
router.use(auth);
router.use(business);

// Requirements
router.post("/requirements", Controller.createRequirement);
router.get("/requirements", Controller.getRequirements);
router.put("/requirements/:id", Controller.updateRequirement);

// Estimations
router.post("/estimations", Controller.createEstimation);
router.get("/estimations", Controller.getEstimations);

// Projects
router.post("/", Controller.createProject);
router.get("/", Controller.getProjects);
router.get("/:id", Controller.getProjectDetails);
router.put("/:id", Controller.updateProject);

// Milestones
router.post("/:projectId/milestones", Controller.createMilestone);
router.get("/:projectId/milestones", Controller.getMilestones);

// Tasks
router.post("/:projectId/tasks", Controller.createTask);
router.get("/:projectId/tasks", Controller.getTasks);
router.put("/tasks/:id", Controller.updateTask);

// Issues
router.post("/:projectId/issues", Controller.createIssue);
router.get("/:projectId/issues", Controller.getIssues);
router.put("/issues/:id", Controller.updateIssue);

// Change Requests
router.post("/:projectId/change-requests", Controller.createChangeRequest);
router.get("/:projectId/change-requests", Controller.getChangeRequests);
router.put("/change-requests/:id", Controller.updateChangeRequest);

// Time Entries / Timesheets
router.post("/:projectId/time-entries", Controller.createTimeEntry);
router.get("/:projectId/time-entries", Controller.getTimeEntries);

// Inventory
router.post("/:projectId/consume-material", Controller.consumeMaterial);

// Procurement
router.post("/:projectId/procurement/purchase-requests", Controller.createPurchaseRequest);
router.get("/:projectId/procurement/purchase-requests", Controller.getPurchaseRequests);
router.get("/:projectId/procurement/purchase-orders", Controller.getPurchaseOrders);

// Global Project Operations Modules
router.post("/templates", Controller.createTemplate);
router.get("/templates", Controller.getTemplates);
router.get("/portfolio", Controller.getPortfolioDashboard);
router.get("/resources", Controller.getResourceUtilization);

module.exports = router;
