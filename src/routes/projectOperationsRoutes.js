const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const Controller = require("../controllers/projectOperationsController");
const ExportController = require("../controllers/exportController");

// Middlewares
router.use(auth);
router.use(business);

// Requirements
router.get("/inquiries", Controller.getInquiriesByCustomer);
router.post("/requirements", Controller.createRequirement);
router.get("/requirements", Controller.getRequirements);
router.get("/requirements/:id", Controller.getRequirementDetails);
router.put("/requirements/:id", Controller.updateRequirement);

// Estimations
router.post("/estimations", Controller.createEstimation);
router.get("/estimations", Controller.getEstimations);

// Meetings
router.post("/meetings", Controller.createMeeting);
router.get("/meetings", Controller.getMeetings);

// Global Routes
router.get("/global/issues", Controller.getAllIssues);
router.get("/global/change-requests", Controller.getAllChangeRequests);
router.get("/global/budgets", Controller.getGlobalBudgets);
router.post("/global/reallocate-budget", Controller.reallocateBudget);

// Expenses
router.get("/global/expenses", Controller.getGlobalExpenses);
router.post("/global/expenses/create", Controller.createGlobalExpense);
router.post("/global/expenses/workflow", Controller.updateGlobalExpenseWorkflow);

// Billing
router.get("/global/billing", Controller.getGlobalBilling);
router.post("/global/billing/create", Controller.createGlobalInvoice);
router.post("/global/billing/workflow", Controller.updateGlobalInvoiceWorkflow);
router.post("/global/billing/payment", Controller.addGlobalInvoicePayment);

router.get("/global/profitability", Controller.getGlobalProfitability);

// Exports
router.get("/change-requests/export/excel", ExportController.exportChangeRequestsExcel);
router.get("/change-requests/export/pdf", ExportController.exportChangeRequestsPDF);
router.get("/budgets/export/excel", ExportController.exportBudgetsExcel);
router.get("/budgets/export/pdf", ExportController.exportBudgetsPDF);
router.get("/expenses/export/excel", ExportController.exportExpensesExcel);
router.get("/expenses/export/pdf", ExportController.exportExpensesPDF);
router.get("/billing/export/excel", ExportController.exportBillingExcel);
router.get("/billing/export/pdf", ExportController.exportBillingPDF);
router.get("/profitability/export/excel", ExportController.exportProfitabilityExcel);
router.get("/profitability/export/pdf", ExportController.exportProfitabilityPDF);

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
router.get("/resources/export/excel", Controller.exportResourceExcel);
router.get("/resources/export/pdf", Controller.exportResourcePDF);
router.post("/resources/allocate", Controller.createResourceAllocation);

// Masters (lookup values / config)
router.get("/masters", Controller.getMasters);
router.post("/masters", Controller.createMaster);
router.put("/masters/:id", Controller.updateMaster);
router.delete("/masters/:id", Controller.deleteMaster);

// Documents
router.get("/documents", Controller.getDocuments);
router.post("/documents", Controller.createDocument);
router.put("/documents/:id", Controller.updateDocument);
router.delete("/documents/:id", Controller.deleteDocument);
router.post("/documents/:id/audit", Controller.addDocumentAudit);

// Reports (dynamic aggregation)
router.get("/reports/summary", Controller.getReportSummary);
router.get("/reports/export/excel", ExportController.exportReportExcel);
router.get("/reports/export/pdf", ExportController.exportReportPDF);

module.exports = router;
