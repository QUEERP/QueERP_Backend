const prisma = require("../config/prisma");
const crypto = require("crypto");

//////////////////////////////////////////////////////
// CREATE PURCHASE REQUEST
//////////////////////////////////////////////////////
exports.createPurchaseRequest = async (req, res) => {
  try {
    const businessId = req.business.id;
    const {
      requestNumber,
      department,
      status = "DRAFT",
      notes,
      items, // array of { productId, description, quantity, estimatedPrice, itemType, hsnSacCode }
    } = req.body;

    const prId = crypto.randomUUID();

    // Generate requestNumber if not provided
    const finalRequestNumber = requestNumber || `PR-${Date.now()}`;

    const purchaseRequest = await prisma.purchase_requests.create({
      data: {
        id: prId,
        businessId,
        requestNumber: finalRequestNumber,
        department,
        requesterId: req.user.userId,
        status,
        notes,
        purchase_request_items: {
          create: items.map((item) => ({
            id: crypto.randomUUID(),
            productId: item.productId || undefined,
            description: item.description,
            quantity: Number(item.quantity) || 1,
            estimatedPrice: Number(item.estimatedPrice) || 0,
            itemType: item.itemType || "GOODS",
            hsnSacCode: item.hsnSacCode || null
          })).filter(i => i.productId || i.description), // Basic validation
        },
      },
      include: {
        purchase_request_items: true,
      },
    });

    res.status(201).json({
      success: true,
      request: purchaseRequest,
    });
  } catch (error) {
    console.error("createPurchaseRequest error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL PURCHASE REQUESTS
//////////////////////////////////////////////////////
exports.getPurchaseRequests = async (req, res) => {
  try {
    const businessId = req.business.id;

    const requests = await prisma.purchase_requests.findMany({
      where: { businessId },
      include: {
        purchase_request_items: {
          include: {
            Product: true
          }
        },
        business_users: {
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("getPurchaseRequests error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET PURCHASE REQUEST BY ID
//////////////////////////////////////////////////////
exports.getPurchaseRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business.id;

    const request = await prisma.purchase_requests.findFirst({
      where: { id, businessId },
      include: {
        purchase_request_items: {
          include: {
            Product: true
          }
        },
        business_users: {
          include: {
            user: true
          }
        }
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Purchase Request not found",
      });
    }

    res.json({
      success: true,
      request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE PURCHASE REQUEST
//////////////////////////////////////////////////////
exports.updatePurchaseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business.id;
    const { items, ...updateData } = req.body;

    const existing = await prisma.purchase_requests.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Purchase Request not found",
      });
    }

    const updated = await prisma.purchase_requests.update({
      where: { id },
      data: {
        ...updateData,
        // If items are provided, we should ideally delete old ones and create new,
        // but for simplicity we only update base info if items aren't handled perfectly.
      },
    });

    res.json({
      success: true,
      request: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
