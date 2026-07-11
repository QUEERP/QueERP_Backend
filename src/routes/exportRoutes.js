const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const Controller = require("../controllers/exportController");

router.use(auth);
router.use(business);

router.get("/planning/export/excel", Controller.exportPlanningExcel);
router.get("/planning/export/pdf", Controller.exportPlanningPDF);

router.get("/projects/export/excel", Controller.exportPlanningExcel);
router.get("/projects/export/pdf", Controller.exportPlanningPDF);

router.get("/tasks/export/excel", Controller.exportTasksExcel);
router.get("/tasks/export/pdf", Controller.exportTasksPDF);

router.get("/milestones/export/excel", Controller.exportMilestonesExcel);
router.get("/milestones/export/pdf", Controller.exportMilestonesPDF);

router.get("/timesheets/export/excel", Controller.exportTimesheetsExcel);
router.get("/timesheets/export/pdf", Controller.exportTimesheetsPDF);

router.get("/issues/export/excel", Controller.exportIssuesExcel);
router.get("/issues/export/pdf", Controller.exportIssuesPDF);

router.get("/change-requests/export/excel", Controller.exportChangeRequestsExcel);
router.get("/change-requests/export/pdf", Controller.exportChangeRequestsPDF);

module.exports = router;
