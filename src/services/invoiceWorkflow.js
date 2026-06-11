const prisma = require("../config/prisma");
const InventoryService = require("./inventoryService");

class InvoiceWorkflow {
  /**
   * Generates an Invoice automatically from an approved Sales Order
   * (Records only item description/name, HSN/SAC code, qty, and rate - excluding taxes)
   */
  static async createInvoiceFromSalesOrder(params) {
    const { businessId, salesOrderId, invoiceNumber, performedBy, extraData = {} } = params;

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch Sales Order with its items and products
      const salesOrder = await tx.salesOrder.findFirst({
        where: { id: salesOrderId, businessId },
        include: {
          items: {
            include: { product: true }
          },
          customer: true
        }
      });

      if (!salesOrder) {
        throw new Error("Sales Order not found.");
      }

      if (salesOrder.status === "INVOICED") {
        throw new Error("Invoice already created for this Sales Order.");
      }

      let invoiceSubtotal = 0;
      let invoiceTotalTax = 0;
      const invoiceItemsData = [];

      // 2. Loop through Sales Order items and prepare invoice items
      for (const item of salesOrder.items) {
        const itemSubtotal = item.quantity * item.price;
        const taxRate = Number(item.taxPercent || 0);
        const itemTax = Number(((itemSubtotal * taxRate) / 100).toFixed(2));
        
        invoiceSubtotal += itemSubtotal;
        invoiceTotalTax += itemTax;

        invoiceItemsData.push({
          productId: item.productId,
          warehouseId: item.warehouseId,
          description: item.description || (item.product ? item.product.name : "Item"),
          quantity: item.quantity,
          hours: item.quantity, // Preserve backward compatibility with hours
          rate: item.price,
          hsnSacCode: item.hsnSacCode || (item.product ? item.product.taxCode : null),
          amount: itemSubtotal, // pre-tax total amount
          taxPercent: taxRate,
          totalTax: itemTax,
          totalAmount: itemSubtotal + itemTax,
          unit: item.unit || null
        });
      }

      // 3. Create the Invoice record
      const invoice = await tx.invoice.create({
        data: {
          businessId,
          customerId: salesOrder.customerId,
          salesOrderId: salesOrder.id,
          invoiceNumber,
          subtotal: invoiceSubtotal,
          totalTax: invoiceTotalTax,
          grandTotal: invoiceSubtotal + invoiceTotalTax + Number(extraData.shippingCharges || 0) - Number(extraData.tds || 0),
          status: "UNPAID",
          shippingCharges: Number(extraData.shippingCharges || 0),
          cgst: Number(extraData.cgst || 0),
          sgst: Number(extraData.sgst || 0),
          igst: Number(extraData.igst || 0),
          tds: Number(extraData.tds || 0),
          ewayBillNo: extraData.ewayBillNo,
          reverseCharge: !!extraData.reverseCharge,
          transportDetails: extraData.transportDetails,
          vatPercentage: Number(extraData.vatPercentage || 0),
          vatAmount: Number(extraData.vatAmount || 0),
          vatType: extraData.vatType,
          emirate: extraData.emirate,
          items: {
            create: invoiceItemsData
          }
        },
        include: {
          items: true
        }
      });

      // 4. Update Sales Order Status to show completion
      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: "INVOICED" }
      });

      // 5. Release Reserved quantities and deduct physical stock (Sales Flow Shipment)
      for (const item of invoice.items) {
        if (item.productId && item.warehouseId) {
          // Release the reservation held by the Sales Order (if reservedQty was allocated)
          try {
            await InventoryService.releaseReservation({
              productId: item.productId,
              warehouseId: item.warehouseId,
              quantity: item.quantity,
              tx
            });
          } catch (e) {
            console.warn("Reservation release skipped/failed:", e.message);
          }

          // Deduct physical stock and write audit ledger
          await InventoryService.decreaseStock({
            businessId,
            productId: item.productId,
            warehouseId: item.warehouseId,
            quantity: item.quantity,
            type: "SALE_OUT",
            reference: {
              salesOrderId: salesOrder.id,
              invoiceId: invoice.id
            },
            performedBy,
            tx
          });
        }
      }

      return invoice;
    }, {
      maxWait: 5000, // default
      timeout: 20000 // 20 seconds
    });
  }
}

module.exports = InvoiceWorkflow;
