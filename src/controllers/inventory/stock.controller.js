const stockService = require("../../services/inventory/stock.service");
const adjustmentService = require("../../services/inventory/stockAdjustment.service");
const transferService = require("../../services/inventory/stockTransfer.service");
const movementService = require("../../services/inventory/movement.service");
const prisma = require("../../config/prisma");

// ==========================================
// STOCK LEVELS
// ==========================================

exports.getStockLevels = async (req, res) => {
  try {
    const stock = await stockService.getStockLevels(req.business.id, req.query);
    res.json({ success: true, stock });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// STOCK MOVEMENTS (LEDGER)
// ==========================================

exports.getStockMovements = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = { businessId: req.business.id };
    if (req.query.productId) where.productId = req.query.productId;
    if (req.query.warehouseId) where.warehouseId = req.query.warehouseId;
    if (req.query.type) where.type = req.query.type;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          warehouse: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.stockMovement.count({ where })
    ]);

    res.json({
      success: true,
      movements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// BATCHES
// ==========================================

exports.getBatches = async (req, res) => {
  try {
    const batches = await stockService.getBatches(req.business.id, req.query);
    res.json({ success: true, batches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBatchById = async (req, res) => {
  try {
    const batch = await stockService.getBatchById(req.business.id, req.params.id);
    res.json({ success: true, batch });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const batch = await stockService.createBatch(req.business.id, req.body);
    res.status(201).json({ success: true, batch });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ==========================================
// SERIAL NUMBERS
// ==========================================

exports.getSerialNumbers = async (req, res) => {
  try {
    const serials = await stockService.getSerialNumbers(req.business.id, req.query);
    res.json({ success: true, serials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSerialNumber = async (req, res) => {
  try {
    const sn = await stockService.getSerialNumberByVal(req.business.id, req.params.serialNumber);
    res.json({ success: true, serialNumber: sn });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

// ==========================================
// STOCK ADJUSTMENTS
// ==========================================

exports.createStockAdjustment = async (req, res) => {
  try {
    const adjustment = await adjustmentService.createStockAdjustment(
      req.business.id,
      req.user.id,
      req.user.email,
      req.body
    );
    res.status(201).json({ success: true, adjustment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getStockAdjustments = async (req, res) => {
  try {
    const result = await adjustmentService.getStockAdjustments(req.business.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStockAdjustmentById = async (req, res) => {
  try {
    const adjustment = await adjustmentService.getStockAdjustmentById(req.business.id, req.params.id);
    res.json({ success: true, adjustment });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

// ==========================================
// STOCK TRANSFERS
// ==========================================

exports.createStockTransfer = async (req, res) => {
  try {
    const transfer = await transferService.createStockTransfer(
      req.business.id,
      req.user.id,
      req.user.email,
      req.body
    );
    res.status(201).json({ success: true, transfer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getStockTransfers = async (req, res) => {
  try {
    const result = await transferService.getStockTransfers(req.business.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStockTransferById = async (req, res) => {
  try {
    const transfer = await transferService.getStockTransferById(req.business.id, req.params.id);
    res.json({ success: true, transfer });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.changeTransferStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }
    const transfer = await transferService.changeTransferStatus(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.id,
      status
    );
    res.json({ success: true, transfer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
