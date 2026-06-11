const prisma = require("../../config/prisma");
const { logAction } = require("../sales/audit.service");
const { createStockMovement } = require("./movement.service");

// Helper to calculate pagination
const getPagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// ==========================================
// CATEGORY SERVICE
// ==========================================

const createCategory = async (businessId, userId, userEmail, data) => {
  const category = await prisma.category.create({
    data: {
      businessId,
      name: data.name,
      parentId: data.parentId || null,
      isActive: data.isActive !== undefined ? data.isActive : true
    }
  });

  await logAction(null, {
    businessId,
    userId,
    userEmail,
    action: "CATEGORY_CREATED",
    module: "INVENTORY",
    entityType: "Category",
    entityId: category.id,
    details: { name: category.name }
  });

  return category;
};

const getCategories = async (businessId, query = {}) => {
  const where = { businessId };
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === "true";
  }
  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }

  const categories = await prisma.category.findMany({
    where,
    include: {
      parent: { select: { id: true, name: true } },
      children: { select: { id: true, name: true } }
    },
    orderBy: { name: "asc" }
  });

  return categories;
};

const getCategoryById = async (businessId, id) => {
  const category = await prisma.category.findFirst({
    where: { id, businessId },
    include: {
      parent: true,
      children: true
    }
  });

  if (!category) throw new Error("Category not found");
  return category;
};

const updateCategory = async (businessId, userId, userEmail, id, data) => {
  const category = await prisma.category.findFirst({
    where: { id, businessId }
  });
  if (!category) throw new Error("Category not found");

  const updated = await prisma.category.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name : category.name,
      parentId: data.parentId !== undefined ? data.parentId : category.parentId,
      isActive: data.isActive !== undefined ? data.isActive : category.isActive
    }
  });

  await logAction(null, {
    businessId,
    userId,
    userEmail,
    action: "CATEGORY_UPDATED",
    module: "INVENTORY",
    entityType: "Category",
    entityId: id,
    details: { name: updated.name }
  });

  return updated;
};

const deleteCategory = async (businessId, userId, userEmail, id) => {
  const category = await prisma.category.findFirst({
    where: { id, businessId }
  });
  if (!category) throw new Error("Category not found");

  await prisma.category.delete({ where: { id } });

  await logAction(null, {
    businessId,
    userId,
    userEmail,
    action: "CATEGORY_DELETED",
    module: "INVENTORY",
    entityType: "Category",
    entityId: id,
    details: { name: category.name }
  });

  return true;
};

// ==========================================
// BRAND SERVICE
// ==========================================

const createBrand = async (businessId, userId, userEmail, data) => {
  const brand = await prisma.brand.create({
    data: {
      businessId,
      name: data.name,
      description: data.description || null,
      isActive: data.isActive !== undefined ? data.isActive : true
    }
  });

  await logAction(null, {
    businessId,
    userId,
    userEmail,
    action: "BRAND_CREATED",
    module: "INVENTORY",
    entityType: "Brand",
    entityId: brand.id,
    details: { name: brand.name }
  });

  return brand;
};

const getBrands = async (businessId, query = {}) => {
  const where = { businessId };
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === "true";
  }
  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }

  return await prisma.brand.findMany({
    where,
    orderBy: { name: "asc" }
  });
};

const updateBrand = async (businessId, userId, userEmail, id, data) => {
  const brand = await prisma.brand.findFirst({ where: { id, businessId } });
  if (!brand) throw new Error("Brand not found");

  const updated = await prisma.brand.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name : brand.name,
      description: data.description !== undefined ? data.description : brand.description,
      isActive: data.isActive !== undefined ? data.isActive : brand.isActive
    }
  });

  await logAction(null, {
    businessId,
    userId,
    userEmail,
    action: "BRAND_UPDATED",
    module: "INVENTORY",
    entityType: "Brand",
    entityId: id,
    details: { name: updated.name }
  });

  return updated;
};

const deleteBrand = async (businessId, userId, userEmail, id) => {
  const brand = await prisma.brand.findFirst({ where: { id, businessId } });
  if (!brand) throw new Error("Brand not found");

  await prisma.brand.delete({ where: { id } });

  await logAction(null, {
    businessId,
    userId,
    userEmail,
    action: "BRAND_DELETED",
    module: "INVENTORY",
    entityType: "Brand",
    entityId: id,
    details: { name: brand.name }
  });

  return true;
};

// ==========================================
// UNIT SERVICE
// ==========================================

const createUnit = async (businessId, userId, userEmail, data) => {
  const unit = await prisma.unit.create({
    data: {
      businessId,
      name: data.name,
      description: data.description || null,
      isActive: data.isActive !== undefined ? data.isActive : true
    }
  });

  await logAction(null, {
    businessId,
    userId,
    userEmail,
    action: "UNIT_CREATED",
    module: "INVENTORY",
    entityType: "Unit",
    entityId: unit.id,
    details: { name: unit.name }
  });

  return unit;
};

const getUnits = async (businessId, query = {}) => {
  const where = { businessId };
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === "true";
  }
  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }

  return await prisma.unit.findMany({
    where,
    orderBy: { name: "asc" }
  });
};

const updateUnit = async (businessId, userId, userEmail, id, data) => {
  const unit = await prisma.unit.findFirst({ where: { id, businessId } });
  if (!unit) throw new Error("Unit not found");

  const updated = await prisma.unit.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name : unit.name,
      description: data.description !== undefined ? data.description : unit.description,
      isActive: data.isActive !== undefined ? data.isActive : unit.isActive
    }
  });

  await logAction(null, {
    businessId,
    userId,
    userEmail,
    action: "UNIT_UPDATED",
    module: "INVENTORY",
    entityType: "Unit",
    entityId: id,
    details: { name: updated.name }
  });

  return updated;
};

const deleteUnit = async (businessId, userId, userEmail, id) => {
  const unit = await prisma.unit.findFirst({ where: { id, businessId } });
  if (!unit) throw new Error("Unit not found");

  await prisma.unit.delete({ where: { id } });

  await logAction(null, {
    businessId,
    userId,
    userEmail,
    action: "UNIT_DELETED",
    module: "INVENTORY",
    entityType: "Unit",
    entityId: id,
    details: { name: unit.name }
  });

  return true;
};

// ==========================================
// PRODUCT SERVICE
// ==========================================

const createProduct = async (businessId, userId, userEmail, data) => {
  return await prisma.$transaction(async (tx) => {
    // Check if SKU exists
    const existing = await tx.product.findFirst({
      where: { sku: data.sku, businessId }
    });
    if (existing) {
      throw new Error(`A product with SKU "${data.sku}" already exists.`);
    }

    const product = await tx.product.create({
      data: {
        businessId,
        name: data.name,
        description: data.description || null,
        sku: data.sku,
        barcode: data.barcode || null,
        price: parseFloat(data.price),
        costPrice: parseFloat(data.costPrice),
        type: data.type || "GOODS",
        taxCode: data.taxCode || null,
        taxPercent: data.taxPercent !== undefined ? parseFloat(data.taxPercent) : 0,
        unit: data.unit || "pcs",
        isActive: data.isActive !== undefined ? data.isActive : true,
        categoryId: data.categoryId || null,
        brandId: data.brandId || null,
        unitId: data.unitId || null,
        reorderLevel: data.reorderLevel !== undefined ? parseFloat(data.reorderLevel) : 0,
        minimumStock: data.minimumStock !== undefined ? parseFloat(data.minimumStock) : 0,
        openingStock: data.openingStock !== undefined ? parseFloat(data.openingStock) : 0,
        isBatchTracking: data.isBatchTracking !== undefined ? data.isBatchTracking : false,
        isSerialTracking: data.isSerialTracking !== undefined ? data.isSerialTracking : false,
        image: data.image || null,
        attachments: data.attachments || null
      }
    });

    // Handle opening stock if provided
    if (data.openingStock && parseFloat(data.openingStock) > 0 && data.openingStockWarehouseId) {
      await createStockMovement(tx, {
        businessId,
        productId: product.id,
        warehouseId: data.openingStockWarehouseId,
        quantity: parseFloat(data.openingStock),
        type: "OPENING_STOCK",
        notes: "Initial opening stock upon product creation",
        performedBy: userEmail
      });
    }

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "PRODUCT_CREATED",
      module: "INVENTORY",
      entityType: "Product",
      entityId: product.id,
      details: { name: product.name, sku: product.sku }
    });

    return product;
  });
};

const getProducts = async (businessId, query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const where = { businessId };

  if (query.isActive !== undefined) {
    where.isActive = query.isActive === "true";
  }
  if (query.type) {
    where.type = query.type;
  }
  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }
  if (query.brandId) {
    where.brandId = query.brandId;
  }
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { sku: { contains: query.search, mode: "insensitive" } },
      { barcode: { contains: query.search, mode: "insensitive" } }
    ];
  }

  // Sort logic
  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder || "desc";
  const orderBy = { [sortBy]: sortOrder };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        productUnit: { select: { id: true, name: true } },
        stock: {
          include: {
            warehouse: { select: { id: true, name: true } }
          }
        }
      },
      orderBy
    }),
    prisma.product.count({ where })
  ]);

  return {
    products,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

const getProductById = async (businessId, id) => {
  const product = await prisma.product.findFirst({
    where: { id, businessId },
    include: {
      category: true,
      brand: true,
      productUnit: true,
      stock: {
        include: {
          warehouse: true
        }
      }
    }
  });

  if (!product) throw new Error("Product not found");
  return product;
};

const updateProduct = async (businessId, userId, userEmail, id, data) => {
  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id, businessId }
    });
    if (!product) throw new Error("Product not found");

    if (data.sku && data.sku !== product.sku) {
      const existing = await tx.product.findFirst({
        where: { sku: data.sku, businessId, NOT: { id } }
      });
      if (existing) {
        throw new Error(`A product with SKU "${data.sku}" already exists.`);
      }
    }

    const updated = await tx.product.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : product.name,
        description: data.description !== undefined ? data.description : product.description,
        sku: data.sku !== undefined ? data.sku : product.sku,
        barcode: data.barcode !== undefined ? data.barcode : product.barcode,
        price: data.price !== undefined ? parseFloat(data.price) : product.price,
        costPrice: data.costPrice !== undefined ? parseFloat(data.costPrice) : product.costPrice,
        type: data.type !== undefined ? data.type : product.type,
        taxCode: data.taxCode !== undefined ? data.taxCode : product.taxCode,
        taxPercent: data.taxPercent !== undefined ? parseFloat(data.taxPercent) : product.taxPercent,
        unit: data.unit !== undefined ? data.unit : product.unit,
        isActive: data.isActive !== undefined ? data.isActive : product.isActive,
        categoryId: data.categoryId !== undefined ? data.categoryId : product.categoryId,
        brandId: data.brandId !== undefined ? data.brandId : product.brandId,
        unitId: data.unitId !== undefined ? data.unitId : product.unitId,
        reorderLevel: data.reorderLevel !== undefined ? parseFloat(data.reorderLevel) : product.reorderLevel,
        minimumStock: data.minimumStock !== undefined ? parseFloat(data.minimumStock) : product.minimumStock,
        isBatchTracking: data.isBatchTracking !== undefined ? data.isBatchTracking : product.isBatchTracking,
        isSerialTracking: data.isSerialTracking !== undefined ? data.isSerialTracking : product.isSerialTracking,
        image: data.image !== undefined ? data.image : product.image,
        attachments: data.attachments !== undefined ? data.attachments : product.attachments
      }
    });

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "PRODUCT_UPDATED",
      module: "INVENTORY",
      entityType: "Product",
      entityId: id,
      details: { name: updated.name, sku: updated.sku }
    });

    return updated;
  });
};

const deleteProduct = async (businessId, userId, userEmail, id) => {
  const product = await prisma.product.findFirst({
    where: { id, businessId }
  });
  if (!product) throw new Error("Product not found");

  await prisma.product.delete({ where: { id } });

  await logAction(null, {
    businessId,
    userId,
    userEmail,
    action: "PRODUCT_DELETED",
    module: "INVENTORY",
    entityType: "Product",
    entityId: id,
    details: { name: product.name, sku: product.sku }
  });

  return true;
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  createBrand,
  getBrands,
  updateBrand,
  deleteBrand,
  createUnit,
  getUnits,
  updateUnit,
  deleteUnit,
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
};
