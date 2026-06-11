const billService = require("../../services/purchase/bill.service");
const paymentService = require("../../services/purchase/payment.service");

// ==========================================
// BILLS
// ==========================================

exports.createBill = async (req, res) => {
  try {
    const bill = await billService.createBill(
      req.business.id,
      req.user.id,
      req.user.email,
      req.body
    );
    res.status(201).json({ success: true, bill });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getBills = async (req, res) => {
  try {
    const result = await billService.getBills(req.business.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBillById = async (req, res) => {
  try {
    const bill = await billService.getBillById(req.business.id, req.params.id);
    res.json({ success: true, bill });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

// ==========================================
// VENDOR PAYMENTS (on a bill)
// ==========================================

exports.recordPayment = async (req, res) => {
  try {
    const payment = await paymentService.recordVendorPayment(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.billId,
      req.body
    );
    res.status(201).json({ success: true, payment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getPaymentsByBill = async (req, res) => {
  try {
    const payments = await paymentService.getPaymentsByBillId(req.business.id, req.params.billId);
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
