const prisma = require("../config/prisma");
const InventoryService = require("../services/inventoryService");
const TaxEngine = require("../services/taxEngine");
const salesOrderService = require("../services/sales/salesOrder.service");
const { createSalesOrderSchema, updateSalesOrderSchema } = require("../validations/sales.validation");
const { successResponse, errorResponse } = require("../utils/response");

const VALID_STATUS = ["DRAFT", "Draft", "CONFIRMED", "Confirmed", "PROCESSING", "Processing", "FULFILLED", "Completed", "INVOICED", "Invoiced", "CANCELLED", "Cancelled", "APPROVED", "Approved", "PARTIALLY_FULFILLED"];

//////////////////////////////////////////////////////
// GENERATE ORDER NUMBER
//////////////////////////////////////////////////////
const generateOrderNumber = async (businessId) => {
  const count = await prisma.salesOrder.count({ where: { businessId } });
  return `SO-${(count + 1).toString().padStart(3, "0")}`;
};

//////////////////////////////////////////////////////
// CREATE SALES ORDER
// Keeps HEAD's rich direct-DB logic (TaxEngine + InventoryService stock reservation)
// The service-layer variant is available via salesOrderService.createSalesOrder
//////////////////////////////////////////////////////
exports.createSalesOrder = async (req, res) => {
  try {
    const {
      customerId,
      quotationId,
      dealId,
      assignedToId,
      items,
      discount = 0,
      shippingCharges = 0,
      orderDate,
      deliveryDate,
      notes,
      termsConditions,
      currency,
      customerReference,
      shippingMethod,
      paymentTerms,
      deliveryInstructions,
      placeOfSupply,
      // Tax fields
      cgst,
      sgst,
      igst,
      tds,
      ewayBillNo,
      reverseCharge = false,
      transportDetails,
      vatPercentage,
      vatAmount,
      vatType = "exclusive",
      emirate
    } = req.body;

    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "customerId and items are required",
      });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId: req.business.id },
    });

    if (!customer) {
      return res.status(400).json({ success: false, message: "Customer not found" });
    }

    const settings = await prisma.settings.findUnique({
      where: { businessId: req.business.id },
    });

    const order = await prisma.$transaction(async (tx) => {
      let calculatedSubtotal = 0;
      let totalTaxAmount = 0;

      const mappedItems = [];
      for (const item of items) {
        const lineAmount = Number(item.quantity || 0) * Number(item.price || 0);

        const taxResult = TaxEngine.calculateTax({
          companyCountry: settings?.country || 'UAE',
          companyState: settings?.state || '',
          customerCountry: customer.country || 'UAE',
          customerState: customer.state || '',
          taxPercent: Number(item.taxPercent || 0),
          lineSubtotal: lineAmount,
          vatType: vatType || 'exclusive',
          manualTax: {
            cgstRate: item.cgstPercent,
            sgstRate: item.sgstPercent,
            igstRate: item.igstPercent
          }
        });

        const effectiveSubtotal = taxResult.effectiveSubtotal !== undefined ? taxResult.effectiveSubtotal : lineAmount;
        calculatedSubtotal += effectiveSubtotal;
        totalTaxAmount += taxResult.totalTaxAmount;

        // Warehouse-wise stock validation & Reservation
        if (item.productId && item.warehouseId) {
          await InventoryService.reserveStock({
            productId: item.productId,
            warehouseId: item.warehouseId,
            quantity: Number(item.quantity),
            tx
          });
        }

        mappedItems.push({
          productId: item.productId,
          warehouseId: item.warehouseId,
          description: item.description || item.name,
          itemType: item.itemType || item.type || 'GOODS',
          hsnSacCode: item.hsnSacCode || item.hsn,
          quantity: Number(item.quantity || 0),
          price: Number(item.price || 0),
          taxPercent: Number(item.taxPercent || 0),
          unit: item.unit || 'pcs',
          total: effectiveSubtotal + taxResult.totalTaxAmount,
          taxDetails: taxResult.breakdown,
          updatedAt: new Date()
        });
      }

      const finalGrandTotal = calculatedSubtotal + totalTaxAmount + Number(shippingCharges || 0) - Number(discount || 0) - Number(tds || 0);

      return tx.salesOrder.create({
        data: {
          businessId: req.business.id,
          orderNumber: await generateOrderNumber(req.business.id),
          customerId,
          quotationId: quotationId || null,
          dealId: dealId || null,
          assignedToId: assignedToId || null,
          subtotal: calculatedSubtotal,
          tax: totalTaxAmount,
          discount: Number(discount || 0),
          shippingCharges: Number(shippingCharges || 0),
          totalAmount: finalGrandTotal,
          orderDate: new Date(orderDate),
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          notes,
          termsConditions,
          currency: currency || customer.currency || settings?.currency || "AED",
          customerReference,
          shippingMethod,
          paymentTerms,
          deliveryInstructions,
          placeOfSupply,
          // India fields
          cgst: Number(cgst || 0),
          sgst: Number(sgst || 0),
          igst: Number(igst || 0),
          tds: Number(tds || 0),
          ewayBillNo,
          reverseCharge: !!reverseCharge,
          transportDetails,
          // UAE fields
          vatPercentage: Number(vatPercentage || 0),
          vatAmount: Number(vatAmount || 0),
          vatType,
          emirate,
          items: { create: mappedItems },
        },
        include: { items: true },
      });
    });

    return successResponse(res, order, "Sales Order created successfully and stock reserved", 201);
  } catch (error) {
    console.error("createSalesOrder error:", error);
    if (error.name === "ZodError") {
      return errorResponse(res, error.errors[0].message, 400, error.errors);
    }
    return errorResponse(res, error.message, 400);
  }
};

//////////////////////////////////////////////////////
// CONVERT QUOTATION TO SALES ORDER
//////////////////////////////////////////////////////
exports.convertQuotation = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { quotationId } = req.params;

    const order = await salesOrderService.convertQuotationToSalesOrder(businessId, userId, userEmail, quotationId);

    return successResponse(res, order, "Quotation converted to Sales Order successfully", 201);
  } catch (error) {
    console.error("convertQuotation controller error:", error);
    return errorResponse(res, error.message, 400);
  }
};

//////////////////////////////////////////////////////
// GET ALL SALES ORDERS
//////////////////////////////////////////////////////
exports.getSalesOrders = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { customerId, status } = req.query;

    const orders = await prisma.salesOrder.findMany({
      where: {
        businessId,
        isDeleted: false,
        customerId: customerId || undefined,
        status: status || undefined
      },
      include: {
        customer: { select: { id: true, company: true } },
        items: true
      },
      orderBy: { createdAt: "desc" }
    });

    return successResponse(res, orders, "Sales Orders fetched successfully");
  } catch (error) {
    console.error("getSalesOrders controller error:", error);
    return errorResponse(res, error.message, 500);
  }
};

//////////////////////////////////////////////////////
// GET SALES ORDER BY ID
//////////////////////////////////////////////////////
exports.getSalesOrderById = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const order = await salesOrderService.getSalesOrderById(businessId, id);

    return successResponse(res, order, "Sales Order retrieved successfully");
  } catch (error) {
    console.error("getSalesOrderById controller error:", error);
    return errorResponse(res, error.message, 404);
  }
};

//////////////////////////////////////////////////////
// UPDATE SALES ORDER
// HEAD's rich inline logic for item recalculation + TaxEngine is preserved
//////////////////////////////////////////////////////
exports.updateSalesOrder = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;
    const {
      customerId,
      items,
      discount = 0,
      shippingCharges = 0,
      orderDate,
      deliveryDate,
      status,
      cgst,
      sgst,
      igst,
      tds,
      ewayBillNo,
      reverseCharge,
      transportDetails,
      vatPercentage,
      vatAmount,
      vatType = "exclusive",
      emirate,
      ...otherData
    } = req.body;

    // 1. Check if order exists
    const existingOrder = await prisma.salesOrder.findFirst({
      where: { id, businessId },
      include: { items: true }
    });

    if (!existingOrder) {
      return res.status(404).json({ success: false, message: "Sales order not found" });
    }

    // 2. Normalize status
    let normalizedStatus = status;
    if (status) {
      const statusMap = {
        'Draft': 'DRAFT',
        'Confirmed': 'CONFIRMED',
        'Approved': 'APPROVED',
        'Partially Fulfilled': 'PARTIALLY_FULFILLED',
        'Fulfilled': 'FULFILLED',
        'Invoiced': 'INVOICED',
        'Cancelled': 'CANCELLED'
      };
      normalizedStatus = statusMap[status] || status.toUpperCase();
    }

    // 3. Recalculate if items are provided
    const result = await prisma.$transaction(async (tx) => {
      let finalUpdateData = {
        ...otherData,
        discount: Number(discount),
        shippingCharges: Number(shippingCharges),
        status: normalizedStatus,
        orderDate: orderDate ? new Date(orderDate) : undefined,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        cgst: Number(cgst || 0),
        sgst: Number(sgst || 0),
        igst: Number(igst || 0),
        tds: Number(tds || 0),
        ewayBillNo,
        reverseCharge: !!reverseCharge,
        transportDetails,
        vatPercentage: Number(vatPercentage || 0),
        vatAmount: Number(vatAmount || 0),
        vatType,
        emirate
      };

      if (items && items.length > 0) {
        const customer = await tx.customer.findFirst({
          where: { id: customerId || existingOrder.customerId, businessId },
        });
        const settings = await tx.settings.findUnique({ where: { businessId } });

        let calculatedSubtotal = 0;
        let totalTaxAmount = 0;
        const mappedItems = [];

        // Delete existing items
        await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } });

        for (const item of items) {
          const lineAmount = Number(item.quantity || 0) * Number(item.price || 0);

          const taxResult = TaxEngine.calculateTax({
            companyCountry: settings?.country || 'UAE',
            companyState: settings?.state || '',
            customerCountry: customer?.country || 'UAE',
            customerState: customer?.state || '',
            taxPercent: Number(item.taxPercent || 0),
            lineSubtotal: lineAmount,
            vatType: vatType || 'exclusive',
            manualTax: {
              cgstRate: item.cgstPercent,
              sgstRate: item.sgstPercent,
              igstRate: item.igstPercent
            }
          });

          const effectiveSubtotal = taxResult.effectiveSubtotal !== undefined ? taxResult.effectiveSubtotal : lineAmount;
          calculatedSubtotal += effectiveSubtotal;
          totalTaxAmount += taxResult.totalTaxAmount;

          mappedItems.push({
            productId: item.productId,
            warehouseId: item.warehouseId,
            description: item.description || item.name,
            itemType: item.itemType || 'GOODS',
            hsnSacCode: item.hsnSacCode,
            quantity: Number(item.quantity || 0),
            price: Number(item.price || 0),
            taxPercent: Number(item.taxPercent || 0),
            unit: item.unit || 'pcs',
            total: effectiveSubtotal + taxResult.totalTaxAmount,
            taxDetails: taxResult.breakdown,
          });
        }

        const finalGrandTotal = calculatedSubtotal + totalTaxAmount + Number(shippingCharges) - Number(discount) - Number(tds || 0);

        finalUpdateData.subtotal = calculatedSubtotal;
        finalUpdateData.tax = totalTaxAmount;
        finalUpdateData.totalAmount = finalGrandTotal;
        finalUpdateData.items = { create: mappedItems };
      }

      return await tx.salesOrder.update({
        where: { id },
        data: finalUpdateData,
        include: { items: true }
      });
    });

    return successResponse(res, result, "Sales Order updated successfully");
  } catch (error) {
    console.error("updateSalesOrder controller error:", error);
    if (error.name === "ZodError") {
      return errorResponse(res, error.errors[0].message, 400, error.errors);
    }
    return errorResponse(res, error.message, 400);
  }
};

//////////////////////////////////////////////////////
// DELETE SALES ORDER
//////////////////////////////////////////////////////
exports.deleteSalesOrder = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { id } = req.params;

    await salesOrderService.deleteSalesOrder(businessId, userId, userEmail, id);

    return successResponse(res, null, "Sales Order deleted and stock reservation released successfully");
  } catch (error) {
    console.error("deleteSalesOrder controller error:", error);
    return errorResponse(res, error.message, 400);
  }
};

//////////////////////////////////////////////////////
// CHANGE STATUS
//////////////////////////////////////////////////////
exports.changeStatus = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return errorResponse(res, "Status is required", 400);
    }

    const order = await salesOrderService.changeStatus(businessId, userId, userEmail, id, status);

    return successResponse(res, order, "Sales Order status updated successfully");
  } catch (error) {
    console.error("changeStatus controller error:", error);
    return errorResponse(res, error.message, 400);
  }
};