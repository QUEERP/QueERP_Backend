const prisma = require("../../config/prisma");
const { logAction } = require("../sales/audit.service");
const { generateDocNumber } = require("../sales/quotation.service");
const { createStockMovement } = require("../inventory/movement.service");

const getPagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const createPurchaseReturn = async (businessId, userId, userEmail, data) => {
  return await prisma.$transaction(async (tx) => {
    // Generate Return Number
    const returnNumber = await generateDocNumber(tx, businessId, "PRT", "purchaseReturn", "returnNumber");

    let subtotal = 0;
    const itemsData = data.items.map(item => {
      const qty = parseFloat(item.quantity);
      const price = parseFloat(item.price);
      const taxPercent = parseFloat(item.taxPercent || 0);
      const itemSubtotal = qty * price;
      const itemTotal = itemSubtotal * (1 + taxPercent / 100);
      subtotal += itemSubtotal;

      return {
        productId: item.productId,
        description: item.description || "",
        quantity: qty,
        price,
        taxPercent,
        total: itemTotal,
        warehouseId: item.warehouseId || data.warehouseId || null,
        isStockReturned: item.isStockReturned !== undefined ? item.isStockReturned : true
      };
    });

    const tax = data.tax ? parseFloat(data.tax) : 0;
    const totalAmount = subtotal + tax;

    const purchaseReturn = await tx.purchaseReturn.create({
      data: {
        businessId,
        returnNumber,
        vendorId: data.vendorId,
        billId: data.billId || null,
        grnId: data.grnId || null,
        status: "PENDING",
        reason: data.reason || null,
        refundStatus: "PENDING",
        subtotal,
        tax,
        totalAmount,
        items: {
          create: itemsData
        }
      },
      include: {
        items: true,
        vendor: true
      }
    });

    // Process inventory and vendor balance impacts
    for (const item of itemsData) {
      if (item.isStockReturned && item.warehouseId) {
        // Deduct from warehouse stock via RETURN_OUT movement
        await createStockMovement(tx, {
          businessId,
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: -item.quantity,
          type: "RETURN_OUT",
          referenceType: "PURCHASE_RETURN",
          referenceId: purchaseReturn.id,
          performedBy: userEmail,
          notes: `Stock returned to vendor: ${returnNumber}`
        });
      }
    }

    // Reduce vendor liability balance (refund)
    await tx.vendor.update({
      where: { id: data.vendorId },
      data: {
        balance: {
          decrement: totalAmount
        }
      }
    });

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "PURCHASE_RETURN_CREATED",
      module: "PURCHASE",
      entityType: "PurchaseReturn",
      entityId: purchaseReturn.id,
      details: { returnNumber, totalAmount }
    });

    return purchaseReturn;
  });
};

const getPurchaseReturns = async (businessId, query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const where = { businessId };

  if (query.status) {
    where.status = query.status;
  }
  if (query.vendorId) {
    where.vendorId = query.vendorId;
  }
  if (query.search) {
    where.returnNumber = { contains: query.search, mode: "insensitive" };
  }

  const [returns, total] = await Promise.all([
    prisma.purchaseReturn.findMany({
      where,
      skip,
      take: limit,
      include: {
        vendor: { select: { id: true, name: true, companyName: true } },
        bill: { select: { id: true, billNumber: true } },
        grn: { select: { id: true, grnNumber: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.purchaseReturn.count({ where })
  ]);

  return {
    returns,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

const getPurchaseReturnById = async (businessId, id) => {
  const purchaseReturn = await prisma.purchaseReturn.findFirst({
    where: { id, businessId },
    include: {
      vendor: true,
      bill: true,
      grn: true,
      items: {
        include: {
          product: true,
          warehouse: true
        }
      }
    }
  });

  if (!purchaseReturn) throw new Error("Purchase Return not found");
  return purchaseReturn;
};

module.exports = {
  createPurchaseReturn,
  getPurchaseReturns,
  getPurchaseReturnById
};
