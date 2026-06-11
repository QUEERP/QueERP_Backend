const reportService = require("../../services/crm/reportService");

//////////////////////////////////////////////////////
// FUNNEL CONVERSION REPORT
//////////////////////////////////////////////////////
exports.getFunnelReport = async (req, res) => {
  try {
    const report = await reportService.getLeadFunnelReport(req.business.id);
    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("getFunnelReport error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// REVENUE FORECASTING REPORT
//////////////////////////////////////////////////////
exports.getForecastReport = async (req, res) => {
  try {
    const report = await reportService.getRevenueForecast(req.business.id);
    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("getForecastReport error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// ACTIVITY STATS REPORT
//////////////////////////////////////////////////////
exports.getActivityStatsReport = async (req, res) => {
  try {
    const report = await reportService.getActivityStats(req.business.id);
    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("getActivityStatsReport error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// SALES PIPELINE PERFORMANCE
//////////////////////////////////////////////////////
exports.getSalesPerformanceReport = async (req, res) => {
  try {
    const report = await reportService.getSalesPipelinePerformance(req.business.id);
    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("getSalesPerformanceReport error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// CAMPAIGN ROI REPORT
//////////////////////////////////////////////////////
exports.getCampaignRoiReport = async (req, res) => {
  try {
    const report = await reportService.getCampaignRoiReport(req.business.id);
    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("getCampaignRoiReport error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
