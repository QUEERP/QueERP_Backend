const prisma = require("../../config/prisma");
const { logAction } = require("../sales/audit.service");
const { generateDocNumber } = require("../sales/quotation.service");

const getPagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const createPurchaseRequest = async (businessId, userId, userEmail, data) => {
  return await prisma.$transaction(async (tx) => {
    // Generate Request Number
    const requestNumber = await generateDocNumber(tx, businessId, "PR", "purchaseRequest", "requestNumber");

    const purchaseRequest = await tx.purchaseRequest.create({
      data: {
        businessId,
        requestNumber,
        department: data.department || null,
        requesterId: data.requesterId || null,
        status: data.status || "DRAFT",
        notes: data.notes || null,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            description: item.description || "",
            quantity: parseFloat(item.quantity),
            estimatedPrice: item.estimatedPrice ? parseFloat(item.estimatedPrice) : 0
          }))
        }
      },
      include: {
        items: true
      }
    });

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "PURCHASE_REQUEST_CREATED",
      module: "PURCHASE",
      entityType: "PurchaseRequest",
      entityId: purchaseRequest.id,
      details: { requestNumber, status: purchaseRequest.status }
    });

    return purchaseRequest;
  });
};

const getPurchaseRequests = async (businessId, query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const where = { businessId };

  if (query.status) {
    where.status = query.status;
  }
  if (query.search) {
    where.requestNumber = { contains: query.search, mode: "insensitive" };
  }

  const [requests, total] = await Promise.all([
    prisma.purchaseRequest.findMany({
      where,
      skip,
      take: limit,
      include: {
        requester: { select: { id: true, user: { select: { name: true, email: true } } } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.purchaseRequest.count({ where })
  ]);

  return {
    requests,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

const getPurchaseRequestById = async (businessId, id) => {
  const request = await prisma.purchaseRequest.findFirst({
    where: { id, businessId },
    include: {
      requester: { select: { id: true, user: { select: { name: true, email: true } } } },
      items: {
        include: {
          product: true
        }
      }
    }
  });

  if (!request) throw new Error("Purchase Request not found");
  return request;
};

const updatePurchaseRequest = async (businessId, userId, userEmail, id, data) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.purchaseRequest.findFirst({
      where: { id, businessId }
    });
    if (!existing) throw new Error("Purchase Request not found");

    if (existing.status !== "DRAFT" && existing.status !== "PENDING_APPROVAL") {
      throw new Error(`Cannot update purchase request in ${existing.status} status.`);
    }

    if (data.items) {
      // Re-create items
      await tx.purchaseRequestItem.deleteMany({
        where: { purchaseRequestId: id }
      });
    }

    const updated = await tx.purchaseRequest.update({
      where: { id },
      data: {
        department: data.department !== undefined ? data.department : existing.department,
        requesterId: data.requesterId !== undefined ? data.requesterId : existing.requesterId,
        status: data.status || existing.status,
        notes: data.notes !== undefined ? data.notes : existing.notes,
        items: data.items ? {
          create: data.items.map(item => ({
            productId: item.productId,
            description: item.description || "",
            quantity: parseFloat(item.quantity),
            estimatedPrice: item.estimatedPrice ? parseFloat(item.estimatedPrice) : 0
          }))
        } : undefined
      },
      include: {
        items: true
      }
    });

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "PURCHASE_REQUEST_UPDATED",
      module: "PURCHASE",
      entityType: "PurchaseRequest",
      entityId: id,
      details: { requestNumber: updated.requestNumber }
    });

    return updated;
  });
};

const convertToPurchaseOrder = async (businessId, userId, userEmail, id, vendorId, warehouseId) => {
  return await prisma.$transaction(async (tx) => {
    const request = await tx.purchaseRequest.findFirst({
      where: { id, businessId, isDeleted: false },
      include: { items: { include: { product: true } } }
    });

    if (!request) throw new Error("Purchase Request not found");
    if (request.status !== "APPROVED") {
      throw new Error("Only APPROVED purchase requests can be converted to Purchase Orders.");
    }

    // Generate PO Number
    const poNumber = await generateDocNumber(tx, businessId, "PO", "purchaseOrder", "poNumber");

    // Calculate PO totals based on items
    let subtotal = 0;
    const itemsData = request.items.map(item => {
      const price = item.estimatedPrice || item.product.costPrice || 0;
      const taxPercent = item.product.taxPercent || 0;
      const itemSubtotal = item.quantity * price;
      const itemTotal = itemSubtotal * (1 + taxPercent / 100);
      subtotal += itemSubtotal;

      return {
        productId: item.productId,
        description: item.description || item.product.name,
        itemType: item.product.type || "GOODS",
        hsnSacCode: item.product.taxCode || "",
        quantity: item.quantity,
        price,
        taxPercent,
        total: itemTotal
      };
    });

    const totalTax = itemsData.reduce((acc, curr) => acc + (curr.total - (curr.quantity * curr.price)), 0);
    const totalAmount = subtotal + totalTax;

    const purchaseOrder = await tx.purchaseOrder.create({
      data: {
        businessId,
        poNumber,
        vendorId,
        warehouseId,
        status: "DRAFT",
        subtotal,
        tax: totalTax,
        discount: 0,
        totalAmount,
        orderDate: new Date(),
        items: {
          create: itemsData
        }
      },
      include: {
        items: true
      }
    });

    // Update PR Status
    await tx.purchaseRequest.update({
      where: { id },
      data: { status: "CONVERTED_TO_PO" }
    });

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "PURCHASE_REQUEST_CONVERTED_TO_PO",
      module: "PURCHASE",
      entityType: "PurchaseRequest",
      entityId: id,
      details: { requestNumber: request.requestNumber, poId: purchaseOrder.id, poNumber }
    });

    return purchaseOrder;
  });
};

module.exports = {
  createPurchaseRequest,
  getPurchaseRequests,
  getPurchaseRequestById,
  updatePurchaseRequest,
  convertToPurchaseOrder
};
