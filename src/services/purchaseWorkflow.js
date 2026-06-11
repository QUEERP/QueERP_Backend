const prisma = require("../config/prisma");
const InventoryService = require("./inventoryService");

class PurchaseWorkflow {
  /**
   * Generates a Goods Received Note (GRN) and increases stock visual balances under audit movement
   */
  static async receiveGoods(params) {
    const { businessId, purchaseOrderId, grnNumber, items, performedBy, note } = params;

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch Purchase Order details
      const po = await tx.purchaseOrder.findFirst({
        where: { id: purchaseOrderId, businessId },
        include: { items: true }
      });

      if (!po) {
        throw new Error("Purchase Order not found.");
      }

      // 2. Loop through received goods and record stock increases
      for (const item of items) {
        const poItem = po.items.find(pi => pi.productId === item.productId);
        if (!poItem) {
          throw new Error(`Product ${item.productId} was not part of the original Purchase Order.`);
        }

        // Call the service to increase physical counts and register StockMovement
        await InventoryService.increaseStock({
          businessId,
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: Number(item.receivedQty),
          type: "PURCHASE_IN",
          reference: {
            purchaseOrderId: po.id,
            referenceNo: grnNumber
          },
          performedBy,
          note: note || `Goods Receipt against PO ${po.poNumber}`,
          tx
        });
      }

      // 3. Mark PO status as "Received"
      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: "Received" }
      });

      return { success: true, grnNumber };
    });
  }
}

module.exports = PurchaseWorkflow;
