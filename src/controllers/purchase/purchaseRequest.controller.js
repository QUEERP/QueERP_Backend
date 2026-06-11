const purchaseRequestService = require("../../services/purchase/purchaseRequest.service");

exports.createPurchaseRequest = async (req, res) => {
  try {
    const request = await purchaseRequestService.createPurchaseRequest(
      req.business.id,
      req.user.id,
      req.user.email,
      req.body
    );
    res.status(201).json({ success: true, request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getPurchaseRequests = async (req, res) => {
  try {
    const result = await purchaseRequestService.getPurchaseRequests(req.business.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPurchaseRequestById = async (req, res) => {
  try {
    const request = await purchaseRequestService.getPurchaseRequestById(req.business.id, req.params.id);
    res.json({ success: true, request });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.updatePurchaseRequest = async (req, res) => {
  try {
    const request = await purchaseRequestService.updatePurchaseRequest(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.id,
      req.body
    );
    res.json({ success: true, request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.convertToPurchaseOrder = async (req, res) => {
  try {
    const { vendorId, warehouseId } = req.body;
    if (!vendorId) {
      return res.status(400).json({ success: false, message: "vendorId is required to convert to PO" });
    }
    const purchaseOrder = await purchaseRequestService.convertToPurchaseOrder(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.id,
      vendorId,
      warehouseId || null
    );
    res.status(201).json({ success: true, purchaseOrder });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
