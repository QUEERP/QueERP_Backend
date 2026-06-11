const prisma = require("../../config/prisma");
const { logAction } = require("../sales/audit.service");

const createWarehouse = async (businessId, userId, userEmail, data) => {
  const warehouse = await prisma.warehouse.create({
    data: {
      businessId,
      name: data.name,
      code: data.code || null,
      manager: data.manager || null,
      type: data.type || "STANDARD",
      address: data.address || null,
      city: data.city || null,
      country: data.country || null,
      isActive: data.isActive !== undefined ? data.isActive : true
    }
  });

  await logAction(null, {
    businessId,
    userId,
    userEmail,
    action: "WAREHOUSE_CREATED",
    module: "INVENTORY",
    entityType: "Warehouse",
    entityId: warehouse.id,
    details: { name: warehouse.name, code: warehouse.code }
  });

  return warehouse;
};

const getWarehouses = async (businessId, query = {}) => {
  const where = { businessId };
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === "true";
  }
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { code: { contains: query.search, mode: "insensitive" } }
    ];
  }

  return await prisma.warehouse.findMany({
    where,
    orderBy: { name: "asc" }
  });
};

const getWarehouseById = async (businessId, id) => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id, businessId },
    include: {
      stock: {
        include: {
          product: {
            select: { id: true, name: true, sku: true, price: true }
          }
        }
      }
    }
  });

  if (!warehouse) throw new Error("Warehouse not found");
  return warehouse;
};

const updateWarehouse = async (businessId, userId, userEmail, id, data) => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id, businessId }
  });
  if (!warehouse) throw new Error("Warehouse not found");

  const updated = await prisma.warehouse.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name : warehouse.name,
      code: data.code !== undefined ? data.code : warehouse.code,
      manager: data.manager !== undefined ? data.manager : warehouse.manager,
      type: data.type !== undefined ? data.type : warehouse.type,
      address: data.address !== undefined ? data.address : warehouse.address,
      city: data.city !== undefined ? data.city : warehouse.city,
      country: data.country !== undefined ? data.country : warehouse.country,
      isActive: data.isActive !== undefined ? data.isActive : warehouse.isActive
    }
  });

  await logAction(null, {
    businessId,
    userId,
    userEmail,
    action: "WAREHOUSE_UPDATED",
    module: "INVENTORY",
    entityType: "Warehouse",
    entityId: id,
    details: { name: updated.name, code: updated.code }
  });

  return updated;
};

const deleteWarehouse = async (businessId, userId, userEmail, id) => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id, businessId }
  });
  if (!warehouse) throw new Error("Warehouse not found");

  // Check if warehouse has stock levels
  const hasStock = await prisma.stock.findFirst({
    where: { warehouseId: id, quantity: { gt: 0 } }
  });
  if (hasStock) {
    throw new Error("Cannot delete warehouse with positive stock balance. Please transfer stock first.");
  }

  await prisma.warehouse.delete({ where: { id } });

  await logAction(null, {
    businessId,
    userId,
    userEmail,
    action: "WAREHOUSE_DELETED",
    module: "INVENTORY",
    entityType: "Warehouse",
    entityId: id,
    details: { name: warehouse.name, code: warehouse.code }
  });

  return true;
};

module.exports = {
  createWarehouse,
  getWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse
};
