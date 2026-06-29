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
            productUnit: true,
            category: true,
            brand: true
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

    const adjustmentCount = await prisma.stockAdjustment.count({ where: { businessId } });
    const adjustmentNumber = `ADJ-${(adjustmentCount + 1).toString().padStart(4, "0")}`;

    const adjustment = await prisma.stockAdjustment.create({
      data: {
        businessId,
        adjustmentNumber,
        warehouseId,
        reason: reason || notes || "Manual Adjustment",
        notes,
        items: {
          create: [{
            productId,
            quantity: Number(quantity),
            type: adjustmentType === "ADD" ? "ADD" : "SUBTRACT"
          }]
        }
      },
      include: { items: true }
    });

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

    res.status(201).json({ success: true, adjustment: { ...adjustment, status: "APPROVED" }, movement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// GET ADJUSTMENTS
//////////////////////////////////////////////////////
exports.getAdjustments = async (req, res) => {
  try {
    const adjustments = await prisma.stockAdjustment.findMany({
      where: { businessId: req.business.id },
      include: {
        warehouse: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    
    const formatted = adjustments.map(a => ({ ...a, status: "APPROVED" }));
    res.json({ success: true, adjustments: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// DELETE ADJUSTMENT
//////////////////////////////////////////////////////
exports.deleteAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;

    const adjustment = await prisma.stockAdjustment.findFirst({
      where: { id, businessId },
      include: { items: true }
    });

    if (!adjustment) {
      return res.status(404).json({ success: false, message: "Adjustment not found" });
    }

    for (const item of adjustment.items) {
      if (item.type === "ADD") {
        await InventoryService.decreaseStock({
          businessId,
          productId: item.productId,
          warehouseId: adjustment.warehouseId,
          quantity: item.quantity,
          type: "ADJUSTMENT_OUT",
          performedBy: userId,
          note: `Reversal of deleted adjustment ${adjustment.adjustmentNumber}`
        });
      } else {
        await InventoryService.increaseStock({
          businessId,
          productId: item.productId,
          warehouseId: adjustment.warehouseId,
          quantity: item.quantity,
          type: "ADJUSTMENT_IN",
          performedBy: userId,
          note: `Reversal of deleted adjustment ${adjustment.adjustmentNumber}`
        });
      }
    }

    await prisma.stockAdjustment.delete({ where: { id } });

    res.json({ success: true, message: "Adjustment deleted and stock reversed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};