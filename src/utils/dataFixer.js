/**
 * Utility to ensure old records have necessary default fields 
 * when retrieved from the database, preventing frontend crashes.
 */

const fixProduct = (product) => {
  if (!product) return null;
  return {
    ...product,
    price: product.price ?? 0,
    costPrice: product.costPrice ?? 0,
    taxPercent: product.taxPercent ?? 0,
    unit: product.unit ?? "pcs",
    isActive: product.isActive ?? true,
    reorderLevel: product.reorderLevel ?? 0,
    minimumStock: product.minimumStock ?? 0,
    // Map plural relations from Prisma to singular names for frontend
    category: product.categories || product.category,
    brand: product.brands || product.brand,
    // Handle unit object or string
    unitData: product.units || product.unit,
    // Map stock relation to stockLevels for frontend
    stockLevels: product.stock || []
  };
};

const fixStock = (stock) => {
  if (!stock) return null;
  return {
    ...stock,
    quantity: stock.quantity ?? 0,
    reservedQty: stock.reservedQty ?? 0,
    damagedQty: stock.damagedQty ?? 0,
    product: fixProduct(stock.product)
  };
};

const fixWarehouse = (warehouse) => {
  if (!warehouse) return null;
  return {
    ...warehouse,
    isActive: warehouse.isActive ?? true,
    type: warehouse.type ?? "STANDARD"
  };
};

module.exports = {
  fixProduct,
  fixStock,
  fixWarehouse
};
