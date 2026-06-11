const prisma = require("../config/prisma");
const PurchaseWorkflow = require("../services/purchaseWorkflow");

const VALID_STATUS = ["Draft", "Ordered", "Received", "Cancelled"];

//////////////////////////////////////////////////////
// GENERATE PO NUMBER
//////////////////////////////////////////////////////
const generatePONumber = async (businessId) => {
  const count = await prisma.purchaseOrder.count({ where: { businessId } });
  return `PO-${(count + 1).toString().padStart(3, "0")}`;
};

//////////////////////////////////////////////////////
// CREATE PURCHASE ORDER
//////////////////////////////////////////////////////
exports.createPurchaseOrder = async (req, res) => {
  try {
    const {
      vendorId,
      assignedToId,
      items,
      discount = 0,
      orderDate,
      expectedDeliveryDate,
      notes,
    } = req.body;

    if (!vendorId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "vendorId and items are required",
      });
    }

    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, businessId: req.business.id },
    });

    if (!vendor) {
      return res.status(400).json({ success: false, message: "Vendor not found" });
    }

    let subtotal = 0;
    let totalTax = 0;

    const mappedItems = items.map(item => {
      const lineAmount = Number(item.quantity) * Number(item.price);
      const lineTax = (lineAmount * Number(item.taxPercent || 0)) / 100;
      subtotal += lineAmount;
      totalTax += lineTax;

      return {
        productId: item.productId,
        warehouseId: item.warehouseId,
        description: item.description || item.name,
        itemType: item.itemType || item.type || 'GOODS',
        hsnSacCode: item.hsnSacCode || item.hsn,
        quantity: Number(item.quantity),
        price: Number(item.price),
        taxPercent: Number(item.taxPercent || 0),
        total: lineAmount + lineTax
      };
    });

    const order = await prisma.purchaseOrder.create({
      data: {
        businessId: req.business.id,
        poNumber: await generatePONumber(req.business.id),
        vendorId,
        assignedToId,
        subtotal,
        tax: totalTax,
        discount,
        totalAmount: subtotal + totalTax - discount,
        orderDate: new Date(orderDate),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        notes,
        items: { create: mappedItems },
      },
      include: { vendor: true, items: true },
    });

    res.status(201).json({ success: true, order });

  } catch (error) {
    console.error("createPurchaseOrder error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// RECEIVE GOODS (GRN Flow)
//////////////////////////////////////////////////////
exports.receiveGoods = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, grnNumber, note } = req.body;

    const result = await PurchaseWorkflow.receiveGoods({
      businessId: req.business.id,
      purchaseOrderId: id,
      grnNumber: grnNumber || `GRN-${Date.now()}`,
      items,
      performedBy: req.user.userId,
      note
    });

    res.json(result);
  } catch (error) {
    console.error("receiveGoods error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// GET ALL PURCHASE ORDERS
//////////////////////////////////////////////////////
exports.getPurchaseOrders = async (req, res) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        businessId: req.business.id,
      },
      include: {
        Vendor: true,
        items: true,
        business_users: {
          include: { user: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      orders,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET SINGLE PURCHASE ORDER
//////////////////////////////////////////////////////
exports.getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        businessId: req.business.id,
      },
      include: {
        Vendor: true,
        items: true,
        business_users: {
          include: { user: true },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.json({
      success: true,
      order,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE PURCHASE ORDER
//////////////////////////////////////////////////////
exports.updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.body.status && !VALID_STATUS.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    if (req.body.orderDate) {
      req.body.orderDate = new Date(req.body.orderDate);
    }

    if (req.body.expectedDeliveryDate) {
      req.body.expectedDeliveryDate = new Date(req.body.expectedDeliveryDate);
    }

    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: req.body,
      include: {
        Vendor: true,
        items: true,
      },
    });

    res.json({
      success: true,
      order,
    });

  } catch (error) {
    console.error("updatePurchaseOrder error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// DELETE PURCHASE ORDER
//////////////////////////////////////////////////////
exports.deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.purchaseOrder.deleteMany({
      where: {
        id,
        businessId: req.business.id,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.json({
      success: true,
      message: "Purchase order deleted",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};