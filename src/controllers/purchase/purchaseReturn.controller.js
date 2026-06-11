const purchaseReturnService = require("../../services/purchase/purchaseReturn.service");

exports.createPurchaseReturn = async (req, res) => {
  try {
    const purchaseReturn = await purchaseReturnService.createPurchaseReturn(
      req.business.id,
      req.user.id,
      req.user.email,
      req.body
    );
    res.status(201).json({ success: true, purchaseReturn });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getPurchaseReturns = async (req, res) => {
  try {
    const result = await purchaseReturnService.getPurchaseReturns(req.business.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPurchaseReturnById = async (req, res) => {
  try {
    const purchaseReturn = await purchaseReturnService.getPurchaseReturnById(req.business.id, req.params.id);
    res.json({ success: true, purchaseReturn });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};
