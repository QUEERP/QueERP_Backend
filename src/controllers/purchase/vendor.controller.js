const vendorService = require("../../services/purchase/vendor.service");

exports.createVendor = async (req, res) => {
  try {
    const vendor = await vendorService.createVendor(
      req.business.id,
      req.user.id,
      req.user.email,
      req.body
    );
    res.status(201).json({ success: true, vendor });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const result = await vendorService.getVendors(req.business.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getVendorById = async (req, res) => {
  try {
    const vendor = await vendorService.getVendorById(req.business.id, req.params.id);
    res.json({ success: true, vendor });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const vendor = await vendorService.updateVendor(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.id,
      req.body
    );
    res.json({ success: true, vendor });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    await vendorService.deleteVendor(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.id
    );
    res.json({ success: true, message: "Vendor deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
