const purchaseOrderService = require("../../services/purchase/purchaseOrder.service");

exports.createPurchaseOrder = async (req, res) => {
  try {
    const order = await purchaseOrderService.createPurchaseOrder(
      req.business.id,
      req.user.id,
      req.user.email,
      req.body
    );
    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getPurchaseOrders = async (req, res) => {
  try {
    const result = await purchaseOrderService.getPurchaseOrders(req.business.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPurchaseOrderById = async (req, res) => {
  try {
    const order = await purchaseOrderService.getPurchaseOrderById(req.business.id, req.params.id);
    res.json({ success: true, order });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.updatePurchaseOrder = async (req, res) => {
  try {
    const order = await purchaseOrderService.updatePurchaseOrder(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.id,
      req.body
    );
    res.json({ success: true, order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.changePOStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: "status is required" });
    }
    const order = await purchaseOrderService.changePOStatus(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.id,
      status
    );
    res.json({ success: true, order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
