const inventoryReportService = require("../../services/inventory/inventoryReport.service");

exports.getStockValuation = async (req, res) => {
  try {
    const data = await inventoryReportService.getStockValuation(req.business.id, req.query);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLowStockAlerts = async (req, res) => {
  try {
    const alerts = await inventoryReportService.getLowStockAlerts(req.business.id, req.query);
    res.json({ success: true, alerts, count: alerts.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMovementSummary = async (req, res) => {
  try {
    const summary = await inventoryReportService.getMovementSummary(req.business.id, req.query);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMovementDetail = async (req, res) => {
  try {
    const result = await inventoryReportService.getMovementDetail(req.business.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExpiringBatches = async (req, res) => {
  try {
    const batches = await inventoryReportService.getExpiringBatches(req.business.id, req.query);
    res.json({ success: true, batches, count: batches.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
