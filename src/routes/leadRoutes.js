const router = require("express").Router();

const leadController = require('../controllers/lead.controller');
const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
// CREATE
router.post('/',authMiddleware,businessMiddleware,checkPermission("Leads","create"), leadController.createLead);

// READ
router.get('/',authMiddleware,businessMiddleware,leadController.getAllLeads);
router.get('/:id', authMiddleware,businessMiddleware, leadController.getLeadDetails);

// UPDATE
router.put('/:id', authMiddleware,businessMiddleware,checkPermission("Leads","update"), leadController.updateLead);

// DELETE
router.delete('/:id', authMiddleware,businessMiddleware,checkPermission("Leads","delete"), leadController.deleteLead);

// CONVERT TO CUSTOMER
router.post('/:id/convert',authMiddleware,businessMiddleware,checkPermission("Leads","update"), leadController.convertToCustomer);

// MOVE STAGE
router.put('/:id/move-stage', authMiddleware,businessMiddleware,checkPermission("Leads","update"), leadController.moveStage);
// ADD ACTIVITY
router.post('/:id/activity', authMiddleware,businessMiddleware,checkPermission("Leads","create"), leadController.addActivity);
router.get('/:id/activity', authMiddleware,businessMiddleware, leadController.getActivities);

// ADD NOTE, TASK, REMINDER
router.post('/:id/note', authMiddleware,businessMiddleware,checkPermission("Leads","create"), leadController.addNote);

router.post('/:id/task', authMiddleware,businessMiddleware,checkPermission("Leads","create"), leadController.addTask);

router.post('/:id/reminder', authMiddleware,businessMiddleware,checkPermission("Leads","create"), leadController.addReminder);

// PIPELINE STAGE MANAGEMENT
router.get('/pipeline/stages', authMiddleware, businessMiddleware, leadController.getPipelineStages);
router.post('/pipeline/stages', authMiddleware, businessMiddleware, checkPermission("Leads","create"), leadController.createPipelineStage);
router.put('/pipeline/stages/:id', authMiddleware, businessMiddleware, checkPermission("Leads","update"), leadController.updatePipelineStage);
router.delete('/pipeline/stages/:id', authMiddleware, businessMiddleware, checkPermission("Leads","delete"), leadController.deletePipelineStage);

module.exports = router;