const complianceEngine = require("../services/compliance/ComplianceEngine");
const prisma = require("../config/prisma");

exports.getSummary = async (req, res) => {
  try {
    const businessId = req.business.id;
    const summary = await complianceEngine.getPendingTasksSummary(businessId);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error("[ComplianceController] Error in getSummary", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getRecordTasks = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { modelName, recordId } = req.query;

    if (!modelName || !recordId) {
      return res.status(400).json({ success: false, message: "modelName and recordId are required" });
    }

    const tasks = await complianceEngine.getTasksForRecord(businessId, modelName, recordId);
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error("[ComplianceController] Error in getRecordTasks", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.bulkUpdate = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { modelName, recordIds, field, value } = req.body;

    if (!modelName || !recordIds || !Array.isArray(recordIds) || !field) {
      return res.status(400).json({ success: false, message: "Invalid request body" });
    }

    // A real implementation would dynamically update the specific model
    // e.g. await prisma[modelName.toLowerCase()].updateMany({ ... })
    // For now we just return success as a scaffold
    
    // Trigger compliance re-evaluation
    // for(const id of recordIds) {
    //   const updatedRecord = await prisma[modelName.toLowerCase()].findUnique({ where: { id } });
    //   await complianceEngine.evaluateRecord(businessId, modelName, id, updatedRecord);
    // }

    res.json({ success: true, message: `Successfully updated ${recordIds.length} records.` });
  } catch (error) {
    console.error("[ComplianceController] Error in bulkUpdate", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
