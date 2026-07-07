const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/complianceController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/summary', complianceController.getSummary);
router.get('/tasks', complianceController.getRecordTasks);
router.post('/bulk-update', complianceController.bulkUpdate);

module.exports = router;
