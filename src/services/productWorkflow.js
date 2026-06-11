const prisma = require("../config/prisma");
const InventoryService = require("./inventoryService");

class ProductWorkflow {
  static async createProduct(params) {
    const { businessId, name, sku, description, price, costPrice, hsnCode, taxPercent, unit, initialQty, warehouseId, performedBy } = params;

    return await prisma.$transaction(async (tx) => {
      // 1. Create product record
      const product = await tx.product.create({
        data: {
          businessId,
          name,
          sku,
          description: description || null,
          price: Number(price),
          costPrice: Number(costPrice),
          taxCode: hsnCode || null,
          taxPercent: Number(taxPercent || 0),
          unit: unit || 'pcs',
          type: 'GOODS'
        }
      });

      // 2. Handle initial stock if quantity and warehouse are provided
      if (initialQty && Number(initialQty) > 0) {
        if (!warehouseId) {
          throw new Error("Warehouse ID is required when specifying an initial quantity.");
        }

        // Verify warehouse exists within business context
        const warehouseExists = await tx.warehouse.findFirst({
          where: { id: warehouseId, businessId }
        });

        if (!warehouseExists) {
          throw new Error(`Warehouse ${warehouseId} not found in this business context.`);
        }

        // Add inventory via standard helper safely within transaction
        await InventoryService.increaseStock({
          businessId,
          productId: product.id,
          warehouseId,
          quantity: Number(initialQty),
          type: 'ADJUSTMENT', // Initial quantity labeled as ADJUSTMENT/Opening Stock
          reference: {
            referenceNo: "OPENING_STOCK"
          },
          performedBy,
          note: "Opening stock balance on product initialization.",
          tx
        });
      }

      return product;
    });
  }
}

module.exports = ProductWorkflow;
