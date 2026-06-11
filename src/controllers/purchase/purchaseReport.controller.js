const purchaseReportService = require("../../services/purchase/purchaseReport.service");

exports.getPurchaseSummary = async (req, res) => {
  try {
    const summary = await purchaseReportService.getPurchaseSummary(req.business.id, req.query);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPurchaseByVendor = async (req, res) => {
  try {
    const data = await purchaseReportService.getPurchaseByVendor(req.business.id, req.query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBillsAging = async (req, res) => {
  try {
    const aging = await purchaseReportService.getBillsAging(req.business.id);
    res.json({ success: true, aging });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGRNSummary = async (req, res) => {
  try {
    const grns = await purchaseReportService.getGRNSummary(req.business.id, req.query);
    res.json({ success: true, grns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPurchaseReturnsSummary = async (req, res) => {
  try {
    const returns = await purchaseReportService.getPurchaseReturnsSummary(req.business.id, req.query);
    res.json({ success: true, returns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
