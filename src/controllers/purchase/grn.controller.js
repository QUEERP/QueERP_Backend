const grnService = require("../../services/purchase/grn.service");

exports.createGRN = async (req, res) => {
  try {
    const grn = await grnService.createGRN(
      req.business.id,
      req.user.id,
      req.user.email,
      req.body
    );
    res.status(201).json({ success: true, grn });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getGRNs = async (req, res) => {
  try {
    const result = await grnService.getGRNs(req.business.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGRNById = async (req, res) => {
  try {
    const grn = await grnService.getGRNById(req.business.id, req.params.id);
    res.json({ success: true, grn });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};
