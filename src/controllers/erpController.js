const ProductWorkflow = require("../services/productWorkflow");
const InvoiceWorkflow = require("../services/invoiceWorkflow");
const PurchaseWorkflow = require("../services/purchaseWorkflow");
const { successResponse, errorResponse } = require("../utils/response");
const prisma = require("../config/prisma");

class ErpController {
  /**
   * Add Product with Initial Stock Balance in one atomic transaction
   */
  static async createProduct(req, res) {
    try {
      const { name, sku, description, price, costPrice, hsnCode, taxPercent, unit, initialQty, warehouseId } = req.body;
      const businessId = req.business.id;
      const userId = req.user.userId || req.user.id;

      if (!name || !sku || !price || !costPrice) {
        return errorResponse(res, "Missing required fields (name, sku, price, costPrice).", 400);
      }

      const product = await ProductWorkflow.createProduct({
        businessId,
        name,
        sku,
        description,
        price: Number(price),
        costPrice: Number(costPrice),
        hsnCode: hsnCode || null,
        taxPercent: taxPercent ? Number(taxPercent) : 0,
        unit: unit || "pcs",
        initialQty: initialQty ? Number(initialQty) : 0,
        warehouseId: warehouseId || null,
        performedBy: userId
      });

      return successResponse(res, product, "Product and initial inventory ledger entry created successfully.", 201);
    } catch (error) {
      console.error("ERP create product failure:", error);
      return errorResponse(res, error.message || "Failed to create product.", 500);
    }
  }

  /**
   * Auto-Invoicing Workflow from approved Sales Order
   */
  static async createInvoiceFromSO(req, res) {
    try {
      const { salesOrderId, invoiceNumber } = req.body;
      const businessId = req.business.id;
      const userId = req.user.userId || req.user.id;

      if (!salesOrderId || !invoiceNumber) {
        return errorResponse(res, "Missing required parameters (salesOrderId, invoiceNumber).", 400);
      }

      const invoice = await InvoiceWorkflow.createInvoiceFromSalesOrder({
        businessId,
        salesOrderId,
        invoiceNumber,
        performedBy: userId
      });

      return successResponse(res, invoice, "Invoice generated from Sales Order with exact tax splits and stock deductions.");
    } catch (error) {
      console.error("ERP invoicing workflow failure:", error);
      return errorResponse(res, error.message || "Failed to auto-invoice from Sales Order.", 500);
    }
  }

  /**
   * Goods Received Note (GRN) incoming stock verification
   */
  static async receiveGoods(req, res) {
    try {
      const { purchaseOrderId, grnNumber, items, note } = req.body;
      const businessId = req.business.id;
      const userId = req.user.userId || req.user.id;

      if (!purchaseOrderId || !grnNumber || !Array.isArray(items) || items.length === 0) {
        return errorResponse(res, "Missing required parameters (purchaseOrderId, grnNumber, items array).", 400);
      }

      const result = await PurchaseWorkflow.receiveGoods({
        businessId,
        purchaseOrderId,
        grnNumber,
        items,
        performedBy: userId,
        note
      });

      return successResponse(res, result, "Goods received successfully. Stock levels increased.");
    } catch (error) {
      console.error("ERP goods receipt failure:", error);
      return errorResponse(res, error.message || "Failed to receive goods against Purchase Order.", 500);
    }
  }

  /**
   * Get all GRNs for a business
   */
  static async getGRNs(req, res) {
    try {
      const businessId = req.business.id;
      const grns = await prisma.goods_receive_notes.findMany({
        where: { businessId },
        include: {
          Vendor: true,
          PurchaseOrder: true,
          Warehouse: true,
          goods_receive_note_items: {
            include: {
              Product: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      // Map to frontend expected names (e.g. Vendor -> vendor)
      const formattedGrns = grns.map(g => ({
        ...g,
        vendor: g.Vendor,
        purchaseOrder: g.PurchaseOrder,
        warehouse: g.Warehouse,
        items: g.goods_receive_note_items.map(it => ({
          ...it,
          product: it.Product,
          quantityReceived: it.quantity
        }))
      }));

      return res.json({ success: true, grns: formattedGrns });
    } catch (error) {
      console.error("getGRNs error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get single GRN by ID
   */
  static async getGRNById(req, res) {
    try {
      const { id } = req.params;
      const businessId = req.business.id;

      const grn = await prisma.goods_receive_notes.findFirst({
        where: { id, businessId },
        include: {
          Vendor: true,
          PurchaseOrder: true,
          Warehouse: true,
          goods_receive_note_items: {
            include: {
              Product: true
            }
          }
        }
      });

      if (!grn) {
        return res.status(404).json({ success: false, message: "GRN not found" });
      }

      const formattedGrn = {
        ...grn,
        vendor: grn.Vendor,
        purchaseOrder: grn.PurchaseOrder,
        warehouse: grn.Warehouse,
        items: grn.goods_receive_note_items.map(it => ({
          ...it,
          product: it.Product,
          quantityReceived: it.quantity
        }))
      };

      return res.json({ success: true, grn: formattedGrn });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Delete GRN
   */
  static async deleteGRN(req, res) {
    try {
      const { id } = req.params;
      const businessId = req.business.id;

      // In a real app, you would also reverse stock changes here.
      // For now, just delete the record.
      await prisma.goods_receive_notes.deleteMany({
        where: { id, businessId }
      });

      return res.json({ success: true, message: "GRN deleted" });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Retrieve Stock Audit Movement Timeline
   */
  static async getStockMovements(req, res) {
    try {
      const businessId = req.business.id;
      const { productId, warehouseId, type, page = 1, limit = 20 } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const whereClause = { businessId };

      if (productId) whereClause.productId = productId;
      if (warehouseId) whereClause.warehouseId = warehouseId;
      if (type) whereClause.type = type;

      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where: whereClause,
          include: {
            product: {
              select: { name: true, sku: true }
            },
            warehouse: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: Number(limit)
        }),
        prisma.stockMovement.count({ where: whereClause })
      ]);

      return successResponse(res, {
        movements,
        pagination: {
          total,
          page: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          limit: Number(limit)
        }
      }, "Stock movements history retrieved successfully.");
    } catch (error) {
      console.error("Failed to retrieve stock movements:", error);
      return errorResponse(res, "Failed to retrieve stock movements history.", 500);
    }
  }

  /**
   * Retrieve all warehouse balances
   */
  static async getWarehouseBalances(req, res) {
    try {
      const businessId = req.business.id;
      const { warehouseId, productId } = req.query;

      const whereClause = {
        product: { businessId }
      };

      if (warehouseId) whereClause.warehouseId = warehouseId;
      if (productId) whereClause.productId = productId;

      const stocks = await prisma.stock.findMany({
        where: whereClause,
        include: {
          product: {
            select: { name: true, sku: true, unit: true, price: true, costPrice: true }
          },
          warehouse: {
            select: { name: true, city: true }
          }
        },
        orderBy: {
          product: { name: "asc" }
        }
      });

      return successResponse(res, stocks, "Warehouse stock balances retrieved successfully.");
    } catch (error) {
      console.error("Failed to retrieve stock balances:", error);
      return errorResponse(res, "Failed to retrieve stock balances.", 500);
    }
  }
}

module.exports = ErpController;
