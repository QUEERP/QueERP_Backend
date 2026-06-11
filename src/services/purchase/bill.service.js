const prisma = require("../../config/prisma");
const { logAction } = require("../sales/audit.service");
const { createStockMovement } = require("../inventory/movement.service");

const getPagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const createBill = async (businessId, userId, userEmail, data) => {
  return await prisma.$transaction(async (tx) => {
    // Check if vendor exists
    const vendor = await tx.vendor.findFirst({
      where: { id: data.vendorId, businessId }
    });
    if (!vendor) throw new Error("Vendor not found");

    // Check if billNumber is unique for this vendor/business
    const existing = await tx.bill.findFirst({
      where: { billNumber: data.billNumber, businessId }
    });
    if (existing) {
      throw new Error(`Bill number "${data.billNumber}" already exists.`);
    }

    let subtotal = 0;
    const itemsData = data.items.map(item => {
      const qty = parseFloat(item.quantity);
      const price = parseFloat(item.price);
      const total = qty * price;
      subtotal += total;

      return {
        productId: item.productId || null,
        warehouseId: item.warehouseId || null,
        name: item.name,
        quantity: qty,
        price,
        total
      };
    });

    const tax = data.tax ? parseFloat(data.tax) : 0;
    const discount = data.discount ? parseFloat(data.discount) : 0;
    const totalAmount = subtotal + tax - discount;

    const bill = await tx.bill.create({
      data: {
        businessId,
        billNumber: data.billNumber,
        status: "UNPAID",
        vendorId: data.vendorId,
        purchaseOrderId: data.purchaseOrderId || null,
        grnId: data.grnId || null,
        subtotal,
        tax,
        discount,
        totalAmount,
        outstandingAmount: totalAmount,
        billDate: data.billDate ? new Date(data.billDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes || null,
        items: {
          create: itemsData
        }
      },
      include: {
        items: true
      }
    });

    // Handle Automatic Stock Increase based on Bill Items
    for (const item of itemsData) {
      if (item.productId && item.warehouseId) {
        await createStockMovement(tx, {
          businessId,
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
          type: "PURCHASE",
          referenceType: "Bill",
          referenceId: bill.id,
          notes: `Stock entry from Bill ${bill.billNumber}`,
          performedBy: userEmail
        });
      }
    }

    // Increment Vendor liability balance
    await tx.vendor.update({
      where: { id: data.vendorId },
      data: {
        balance: {
          increment: totalAmount
        }
      }
    });

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "BILL_CREATED",
      module: "PURCHASE",
      entityType: "Bill",
      entityId: bill.id,
      details: { billNumber: bill.billNumber, totalAmount }
    });

    return bill;
  });
};

const getBills = async (businessId, query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const where = { businessId };

  if (query.status) {
    where.status = query.status;
  }
  if (query.vendorId) {
    where.vendorId = query.vendorId;
  }
  if (query.search) {
    where.billNumber = { contains: query.search, mode: "insensitive" };
  }

  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder || "desc";
  const orderBy = { [sortBy]: sortOrder };

  const [bills, total] = await Promise.all([
    prisma.bill.findMany({
      where,
      skip,
      take: limit,
      include: {
        vendor: { select: { id: true, name: true, companyName: true } },
        purchaseOrder: { select: { id: true, poNumber: true } },
        grn: { select: { id: true, grnNumber: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } }
          }
        }
      },
      orderBy
    }),
    prisma.bill.count({ where })
  ]);

  return {
    bills,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

const getBillById = async (businessId, id) => {
  const bill = await prisma.bill.findFirst({
    where: { id, businessId },
    include: {
      vendor: true,
      purchaseOrder: true,
      grn: true,
      items: {
        include: {
          product: true
        }
      },
      payments: true
    }
  });

  if (!bill) throw new Error("Bill not found");
  return bill;
};

module.exports = {
  createBill,
  getBills,
  getBillById
};
