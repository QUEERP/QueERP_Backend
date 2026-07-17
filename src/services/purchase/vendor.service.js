const prisma = require("../../config/prisma");
const { logAction } = require("../sales/audit.service");

const getPagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const generateVendorCode = async (businessId) => {
  const lastVendor = await prisma.vendor.findFirst({
    where: { businessId, vendorCode: { startsWith: 'VND-' } },
    orderBy: { createdAt: 'desc' },
  });
  
  // Need to correctly parse the latest number. Instead of just grabbing the last created, 
  // let's grab the one with the highest vendorCode.
  const highestVendor = await prisma.vendor.findFirst({
    where: { businessId, vendorCode: { startsWith: 'VND-' } },
    orderBy: { vendorCode: 'desc' },
  });

  if (!highestVendor || !highestVendor.vendorCode) return 'VND-00001';
  const lastNumber = parseInt(highestVendor.vendorCode.replace('VND-', ''), 10);
  if (isNaN(lastNumber)) return 'VND-00001';
  return `VND-${String(lastNumber + 1).padStart(5, '0')}`;
};

const createVendor = async (businessId, userId, userEmail, data) => {
  if (!data.name?.trim()) throw new Error("Vendor name is required");

  // Check for duplicate name
  const existingName = await prisma.vendor.findFirst({
    where: { businessId, name: { equals: data.name.trim(), mode: "insensitive" } }
  });
  if (existingName) throw new Error("A vendor with this name already exists in your business");

  // Check for duplicate email
  if (data.email?.trim()) {
    const existingEmail = await prisma.vendor.findFirst({
      where: { businessId, email: { equals: data.email.trim(), mode: "insensitive" } }
    });
    if (existingEmail) throw new Error("A vendor with this email already exists in your business");
  }

  const vendorCode = await generateVendorCode(businessId);
  const openingBalance = data.openingBalance !== undefined ? parseFloat(data.openingBalance) : 0;

  const vendor = await prisma.vendor.create({
    data: {
      businessId,
      vendorCode,
      name: data.name.trim(),
      vendorType: data.vendorType || null,
      contactPerson: data.contactPerson || null,
      email: data.email?.trim() || null,
      countryCode: data.countryCode || null,
      phone: data.phone || null,
      taxRegistrationNumber: data.taxRegistrationNumber || data.vatNumber || null,
      paymentTerms: data.paymentTerms || null,
      currency: data.currency || null,
      openingBalance,
      balance: openingBalance, // Initial running balance is the opening balance
      creditLimit: data.creditLimit !== undefined && data.creditLimit !== null ? parseFloat(data.creditLimit) : null,
      preferredVendor: data.preferredVendor === true || data.preferredVendor === 'true',
      status: data.status || "ACTIVE",
      isActive: data.isActive !== undefined ? data.isActive : true,
      notes: data.notes || null,
      createdBy: userId,
      
      // Legacy fields
      companyName: data.companyName || null,
      vatNumber: data.taxRegistrationNumber || data.vatNumber || null,
      taxNumber: data.taxRegistrationNumber || data.taxNumber || null,
      website: data.website || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zipCode: data.zipCode || null,
      country: data.country || null,
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
  if (query.status) {
    where.status = query.status;
  }
  if (query.vendorType) {
    where.vendorType = query.vendorType;
  }
  if (query.preferredVendor !== undefined) {
    where.preferredVendor = query.preferredVendor === 'true' || query.preferredVendor === true;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search, mode: "insensitive" } },
      { vendorCode: { contains: query.search, mode: "insensitive" } },
      { contactPerson: { contains: query.search, mode: "insensitive" } },
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

  if (data.name?.trim() && data.name.trim() !== vendor.name) {
    const existingName = await prisma.vendor.findFirst({
      where: { businessId, name: { equals: data.name.trim(), mode: "insensitive" }, id: { not: id } }
    });
    if (existingName) throw new Error("A vendor with this name already exists in your business");
  }

  if (data.email?.trim() && data.email.trim() !== vendor.email) {
    const existingEmail = await prisma.vendor.findFirst({
      where: { businessId, email: { equals: data.email.trim(), mode: "insensitive" }, id: { not: id } }
    });
    if (existingEmail) throw new Error("A vendor with this email already exists in your business");
  }

  const updated = await prisma.vendor.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : vendor.name,
      vendorType: data.vendorType !== undefined ? data.vendorType : vendor.vendorType,
      contactPerson: data.contactPerson !== undefined ? data.contactPerson : vendor.contactPerson,
      email: data.email !== undefined ? data.email?.trim() : vendor.email,
      countryCode: data.countryCode !== undefined ? data.countryCode : vendor.countryCode,
      phone: data.phone !== undefined ? data.phone : vendor.phone,
      taxRegistrationNumber: data.taxRegistrationNumber !== undefined ? data.taxRegistrationNumber : vendor.taxRegistrationNumber,
      paymentTerms: data.paymentTerms !== undefined ? data.paymentTerms : vendor.paymentTerms,
      currency: data.currency !== undefined ? data.currency : vendor.currency,
      openingBalance: data.openingBalance !== undefined ? parseFloat(data.openingBalance) : vendor.openingBalance,
      creditLimit: data.creditLimit !== undefined ? (data.creditLimit === null ? null : parseFloat(data.creditLimit)) : vendor.creditLimit,
      preferredVendor: data.preferredVendor !== undefined ? (data.preferredVendor === true || data.preferredVendor === 'true') : vendor.preferredVendor,
      status: data.status !== undefined ? data.status : vendor.status,
      isActive: data.isActive !== undefined ? data.isActive : vendor.isActive,
      notes: data.notes !== undefined ? data.notes : vendor.notes,
      updatedBy: userId,

      companyName: data.companyName !== undefined ? data.companyName : vendor.companyName,
      vatNumber: data.taxRegistrationNumber !== undefined ? data.taxRegistrationNumber : (data.vatNumber !== undefined ? data.vatNumber : vendor.vatNumber),
      taxNumber: data.taxRegistrationNumber !== undefined ? data.taxRegistrationNumber : (data.taxNumber !== undefined ? data.taxNumber : vendor.taxNumber),
      website: data.website !== undefined ? data.website : vendor.website,
      address: data.address !== undefined ? data.address : vendor.address,
      city: data.city !== undefined ? data.city : vendor.city,
      state: data.state !== undefined ? data.state : vendor.state,
      zipCode: data.zipCode !== undefined ? data.zipCode : vendor.zipCode,
      country: data.country !== undefined ? data.country : vendor.country,
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
