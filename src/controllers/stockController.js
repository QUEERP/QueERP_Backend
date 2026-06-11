const prisma = require("../config/prisma");
const InventoryService = require("../services/inventoryService");
const { fixStock } = require("../utils/dataFixer");

//////////////////////////////////////////////////////
// CREATE / UPDATE STOCK (Manual Adjustment)
//////////////////////////////////////////////////////
exports.createStock = async (req, res) => {
  try {
    const { productId, warehouseId, quantity, note } = req.body;

    const movement = await InventoryService.increaseStock({
      businessId: req.business.id,
      productId,
      warehouseId,
      quantity: Number(quantity),
      type: "ADJUSTMENT",
      performedBy: req.user.userId,
      note: note || "Manual stock adjustment"
    });

    res.status(201).json({ success: true, movement });

  } catch (error) {
    console.error("getStock error:", error);
    res.status(500).json({ success: false, message: "Error fetching stock: " + error.message });
  }
};

//////////////////////////////////////////////////////
// GET ALL STOCK (Business Scoped)
//////////////////////////////////////////////////////
exports.getStock = async (req, res) => {
  try {
    const stock = await prisma.stock.findMany({
      where: {
        warehouse: { businessId: req.business.id }
      },
      include: { 
        product: {
          include: {
            units: true,
            categories: true,
            brands: true
          }
        }, 
        warehouse: true 
      },
    });

    // Apply data fixer to ensure old records are consistent
    const formattedStock = stock.map(s => fixStock(s));

    res.json({ success: true, stock: formattedStock });
  } catch (error) {
    console.error("getStock error:", error);
    res.status(500).json({ success: false, message: "Error fetching stock: " + error.message });
  }
};

//////////////////////////////////////////////////////
// GET MOVEMENTS
//////////////////////////////////////////////////////
exports.getMovements = async (req, res) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      where: { businessId: req.business.id },
      include: { product: true, warehouse: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, movements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// CREATE ADJUSTMENT
//////////////////////////////////////////////////////
exports.createAdjustment = async (req, res) => {
  try {
    const { productId, warehouseId, adjustmentType, quantity, reason, notes } = req.body;
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;

    let movement;
    if (adjustmentType === "ADD") {
      movement = await InventoryService.increaseStock({
        businessId,
        productId,
        warehouseId,
        quantity: Number(quantity),
        type: "ADJUSTMENT_IN",
        performedBy: userId,
        note: notes || reason || "Stock Adjustment (Add)"
      });
    } else {
      movement = await InventoryService.decreaseStock({
        businessId,
        productId,
        warehouseId,
        quantity: Number(quantity),
        type: "ADJUSTMENT_OUT",
        performedBy: userId,
        note: notes || reason || "Stock Adjustment (Remove)"
      });
    }

    res.status(201).json({ success: true, movement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};