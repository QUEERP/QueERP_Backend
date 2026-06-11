const prisma = require("../../config/prisma");
const { logAction } = require("../sales/audit.service");

const getPagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const createVendor = async (businessId, userId, userEmail, data) => {
  const vendor = await prisma.vendor.create({
    data: {
      businessId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      companyName: data.companyName || null,
      vatNumber: data.vatNumber || null,
      website: data.website || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zipCode: data.zipCode || null,
      country: data.country || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      status: data.status || "ACTIVE",
      paymentTerms: data.paymentTerms || null,
      taxNumber: data.taxNumber || null,
      balance: data.balance !== undefined ? parseFloat(data.balance) : 0
    }
  });

  await logAction(null, {
    businessId,
    userId,
    userEmail,
    action: "VENDOR_CREATED",
    module: "PURCHASE",
    entityType: "Vendor",
    entityId: vendor.id,
    details: { name: vendor.name, companyName: vendor.companyName }
  });

  return vendor;
};

const getVendors = async (businessId, query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const where = { businessId };

  if (query.isActive !== undefined) {
    where.isActive = query.isActive === "true";
  }
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
      { companyName: { contains: query.search, mode: "insensitive" } }
    ];
  }

  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder || "desc";
  const orderBy = { [sortBy]: sortOrder };

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      skip,
      take: limit,
      orderBy
    }),
    prisma.vendor.count({ where })
  ]);

  return {
    vendors,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

const getVendorById = async (businessId, id) => {
  const vendor = await prisma.vendor.findFirst({
    where: { id, businessId },
    include: {
      purchaseOrders: { select: { id: true, poNumber: true, totalAmount: true, status: true } },
      bills: { select: { id: true, billNumber: true, totalAmount: true, status: true } }
    }
  });

  if (!vendor) throw new Error("Vendor not found");
  return vendor;
};

const updateVendor = async (businessId, userId, userEmail, id, data) => {
  const vendor = await prisma.vendor.findFirst({ where: { id, businessId } });
  if (!vendor) throw new Error("Vendor not found");

  const updated = await prisma.vendor.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name : vendor.name,
      email: data.email !== undefined ? data.email : vendor.email,
      phone: data.phone !== undefined ? data.phone : vendor.phone,
      companyName: data.companyName !== undefined ? data.companyName : vendor.companyName,
      vatNumber: data.vatNumber !== undefined ? data.vatNumber : vendor.vatNumber,
      website: data.website !== undefined ? data.website : vendor.website,
      address: data.address !== undefined ? data.address : vendor.address,
      city: data.city !== undefined ? data.city : vendor.city,
      state: data.state !== undefined ? data.state : vendor.state,
      zipCode: data.zipCode !== undefined ? data.zipCode : vendor.zipCode,
      country: data.country !== undefined ? data.country : vendor.country,
      isActive: data.isActive !== undefined ? data.isActive : vendor.isActive,
      status: data.status !== undefined ? data.status : vendor.status,
      paymentTerms: data.paymentTerms !== undefined ? data.paymentTerms : vendor.paymentTerms,
      taxNumber: data.taxNumber !== undefined ? data.taxNumber : vendor.taxNumber,
      balance: data.balance !== undefined ? parseFloat(data.balance) : vendor.balance
    }
  });

  await logAction(null, {
    businessId,
    userId,
    userEmail,
    action: "VENDOR_UPDATED",
    module: "PURCHASE",
    entityType: "Vendor",
    entityId: id,
    details: { name: updated.name, companyName: updated.companyName }
  });

  return updated;
};

const deleteVendor = async (businessId, userId, userEmail, id) => {
  const vendor = await prisma.vendor.findFirst({ where: { id, businessId } });
  if (!vendor) throw new Error("Vendor not found");

  await prisma.vendor.delete({ where: { id } });

  await logAction(null, {
    businessId,
    userId,
    userEmail,
    action: "VENDOR_DELETED",
    module: "PURCHASE",
    entityType: "Vendor",
    entityId: id,
    details: { name: vendor.name }
  });

  return true;
};

module.exports = {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor
};
