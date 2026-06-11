const invoiceService = require("../services/sales/invoice.service");
const { createInvoiceSchema, updateInvoiceSchema } = require("../validations/sales.validation");
const { successResponse, errorResponse } = require("../utils/response");
const prisma = require("../config/prisma");
const generateInvoicePdfHelper = require("../utils/generateInvoicePdf");
const uploadInvoicePdf = require("../utils/uploadInvoicePdf");
const generateInvoiceNumber = require("../utils/generateInvoiceNumber");
const InventoryService = require("../services/inventoryService");
const TaxEngine = require("../services/taxEngine");
const InvoiceWorkflow = require("../services/invoiceWorkflow");

exports.createInvoice = async (req, res) => {
  console.log("=== CREATE INVOICE CALLED ===");
  try {
    const {
      customerId,
      salesOrderId,
      invoiceDate,
      dueDate,
      currency,
      poNumber,
      poDate,
      soNumber,
      soDate,
      adminNote,
      terms,
      discount = 0,
      shippingCharges = 0,
      items = [],
      designTemplate = "modern",
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

    // 1. If salesOrderId is provided, use workflow for strict ERP consistency
    if (salesOrderId) {
      try {
        const invoiceNumber = await generateInvoiceNumber(req.business.id);
        const invoice = await InvoiceWorkflow.createInvoiceFromSalesOrder({
          businessId: req.business.id,
          salesOrderId,
          invoiceNumber,
          performedBy: req.user.userId,
          extraData: {
            cgst, sgst, igst, tds, ewayBillNo, reverseCharge, transportDetails,
            vatPercentage, vatAmount, vatType, emirate, shippingCharges
          }
        });
        return res.status(201).json({ success: true, data: invoice });
      } catch (workflowErr) {
        return res.status(400).json({ success: false, message: workflowErr.message });
      }
    }

    // 2. Direct Invoice Logic
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId: req.business.id },
    });

    if (!customer) {
      return res.status(400).json({ success: false, message: "Customer not found" });
    }

    const settings = await prisma.settings.findUnique({
      where: { businessId: req.business.id },
    });

    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await generateInvoiceNumber(req.business.id);
      let subtotal = 0;
      let totalTax = 0;

      const invoiceItems = [];
      for (const item of items) {
        const lineAmount = Number(item.quantity || item.hours || 0) * Number(item.rate || 0);

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
        subtotal += effectiveSubtotal;
        totalTax += taxResult.totalTaxAmount;

        invoiceItems.push({
          productId: item.productId,
          warehouseId: item.warehouseId || null,
          description: item.description,
          hsnSacCode: item.hsnSacCode || item.taxCode || null,
          itemType: item.itemType || 'GOODS',
          unit: item.unit || null,
          hours: Number(item.hours || item.quantity),
          quantity: Number(item.quantity || item.hours),
          rate: Number(item.rate),
          amount: effectiveSubtotal,
          taxDetails: taxResult.breakdown,
          taxPercent: Number(item.taxPercent || 0),
          totalTax: taxResult.totalTaxAmount,
          totalAmount: effectiveSubtotal + taxResult.totalTaxAmount,
          discount: Number(item.discount || 0)
        });

        if (item.productId && item.warehouseId) {
          await InventoryService.decreaseStock({
            businessId: req.business.id,
            productId: item.productId,
            warehouseId: item.warehouseId,
            quantity: Number(item.quantity || item.hours),
            type: "SALE_OUT",
            reference: { referenceNo: invoiceNumber },
            performedBy: req.user.userId,
            tx
          });
        }
      }

      const grandTotal = subtotal + totalTax + Number(shippingCharges) - Number(discount) - Number(tds || 0);

      return tx.invoice.create({
        data: {
          businessId: req.business.id,
          customerId,
          invoiceNumber,
          invoiceDate: new Date(invoiceDate),
          dueDate: dueDate ? new Date(dueDate) : null,
          currency: currency || settings?.currency || "AED",
          poNumber,
          poDate: poDate ? new Date(poDate) : null,
          soNumber,
          soDate: soDate ? new Date(soDate) : null,
          adminNote: adminNote || settings?.defaultFooterNote || "Thank you",
          terms: terms || settings?.defaultTerms || "Payment due in 30 days",
          designTemplate,
          subtotal,
          totalTax,
          discount,
          shippingCharges: Number(shippingCharges),
          grandTotal,
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
          emirate,
          items: { create: invoiceItems },
        },
        include: {
          customer: true,
          items: { include: { warehouse: true } }
        },
      });
    }, {
      maxWait: 5000,
      timeout: 20000
    });

    // PDF generation (async)
    try {
      const pdfBuffer = await generateInvoicePdfHelper(invoice, settings);
      if (pdfBuffer) {
        const pdfUrl = await uploadInvoicePdf(pdfBuffer, invoice.invoiceNumber);
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { pdfUrl },
        });
      }
    } catch (pdfErr) {
      console.error("PDF generation error:", pdfErr);
    }

    return successResponse(res, invoice, "Invoice created successfully", 201);
  } catch (error) {
    console.error("createInvoice controller error:", error);
    if (error.name === "ZodError" && error.errors && error.errors.length) {
      return errorResponse(res, error.errors[0].message, 400, error.errors);
    }
    return errorResponse(res, error.message || "Unexpected error", 400);
  }
};

//////////////////////////////////////////////////////
// CONVERT FROM SALES ORDER
//////////////////////////////////////////////////////
exports.createInvoiceFromSalesOrder = async (req, res) => {
  try {
    const { salesOrderId } = req.params;
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;

    const invoiceNumber = await generateInvoiceNumber(businessId);

    const invoice = await InvoiceWorkflow.createInvoiceFromSalesOrder({
      businessId,
      salesOrderId,
      invoiceNumber,
      performedBy: userId
    });

    res.status(201).json({
      success: true,
      message: "Invoice generated from Sales Order successfully.",
      data: invoice
    });
  } catch (error) {
    console.error("createInvoiceFromSalesOrder error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// CONVERT SALES ORDER (service-layer variant)
//////////////////////////////////////////////////////
exports.convertSalesOrder = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { salesOrderId } = req.params;

    let invoice = await invoiceService.convertSalesOrderToInvoice(businessId, userId, userEmail, salesOrderId);

    try {
      const settings = await prisma.settings.findUnique({ where: { businessId } });
      const pdfSettings = settings || { companyName: "Your Company", signatureUrl: null };
      const pdfBuffer = await generateInvoicePdfHelper(invoice, pdfSettings);
      if (pdfBuffer) {
        const pdfUrl = await uploadInvoicePdf(pdfBuffer, invoice.invoiceNumber);
        invoice = await prisma.invoice.update({
          where: { id: invoice.id },
          data: { pdfUrl },
          include: { customer: true, items: true }
        });
      }
    } catch (pdfError) {
      console.error("PDF generation failed on sales order conversion:", pdfError);
    }

    return successResponse(res, invoice, "Sales Order billed to Invoice successfully", 201);
  } catch (error) {
    console.error("convertSalesOrder controller error:", error);
    return errorResponse(res, error.message, 400);
  }
};

//////////////////////////////////////////////////////
// GET ALL
//////////////////////////////////////////////////////
exports.getInvoices = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { customerId, status } = req.query;

    const data = await prisma.invoice.findMany({
      where: {
        businessId,
        isDeleted: false,
        customerId: customerId || undefined,
        status: status || undefined
      },
      include: { customer: true, items: true },
      orderBy: { createdAt: "desc" }
    });

    return successResponse(res, data, "Invoices fetched successfully");
  } catch (err) {
    console.error("getInvoices controller error:", err);
    return errorResponse(res, err.message, 500);
  }
};

//////////////////////////////////////////////////////
// GET ONE
//////////////////////////////////////////////////////
exports.getInvoiceById = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const invoice = await invoiceService.getInvoiceById(businessId, id);
    return successResponse(res, invoice, "Invoice retrieved successfully");
  } catch (err) {
    console.error("getInvoiceById controller error:", err);
    return errorResponse(res, err.message, 404);
  }
};

//////////////////////////////////////////////////////
// UPDATE
//////////////////////////////////////////////////////
exports.updateInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const {
      items = [],
      discount = 0,
      invoiceDate,
      dueDate,
      poNumber,
      poDate,
      soNumber,
      soDate,
      adminNote,
      terms,
      currency,
      designTemplate,
      shippingCharges = 0,
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
      vatType,
      emirate
    } = req.body;

    let subtotal = 0;
    let totalTax = 0;

    const newItems = items.map((i) => {
      const amount = Number(i.hours) * Number(i.rate);
      subtotal += amount;

      const taxes = i.taxes || [];
      const taxDetails = taxes.map(t => ({
        name: t.name,
        rate: Number(t.rate),
        amount: (amount * Number(t.rate)) / 100,
      }));

      const itemTax = taxDetails.reduce((sum, t) => sum + t.amount, 0);
      totalTax += itemTax;

      const isService = i.description && (
        i.description.toLowerCase().includes('service') ||
        i.description.toLowerCase().includes('consulting') ||
        i.description.toLowerCase().includes('development') ||
        i.type === 'SERVICE'
      );

      return {
        invoiceId,
        description: i.description,
        hsnSacCode: i.hsnSacCode || i.taxCode || null,
        itemType: isService ? 'SERVICE' : 'GOODS',
        hours: Number(i.hours),
        rate: Number(i.rate),
        amount,
        taxDetails,
        taxPercent: Number(i.taxPercent || 0),
        totalTax: itemTax,
        totalAmount: amount + itemTax,
      };
    });

    const grandTotal = subtotal + totalTax + Number(shippingCharges) - Number(discount) - Number(tds || 0);

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId } });
      await tx.invoiceItem.createMany({ data: newItems });

      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal,
          totalTax,
          discount,
          grandTotal,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          poNumber,
          poDate: poDate ? new Date(poDate) : undefined,
          soNumber,
          soDate: soDate ? new Date(soDate) : undefined,
          adminNote,
          terms,
          currency,
          designTemplate,
          status,
          shippingCharges: Number(shippingCharges),
          cgst: cgst !== undefined ? Number(cgst) : undefined,
          sgst: sgst !== undefined ? Number(sgst) : undefined,
          igst: igst !== undefined ? Number(igst) : undefined,
          tds: tds !== undefined ? Number(tds) : undefined,
          ewayBillNo,
          reverseCharge: reverseCharge !== undefined ? !!reverseCharge : undefined,
          transportDetails,
          vatPercentage: vatPercentage !== undefined ? Number(vatPercentage) : undefined,
          vatAmount: vatAmount !== undefined ? Number(vatAmount) : undefined,
          vatType,
          emirate,
        },
        include: { customer: true, items: true },
      });
    });

    // Regenerate PDF
    try {
      const settings = await prisma.settings.findUnique({
        where: { businessId: req.business.id },
      });
      const pdfSettings = settings || { companyName: "Your Company", signatureUrl: null };
      const pdfBuffer = await generateInvoicePdfHelper(updatedInvoice, pdfSettings);
      if (pdfBuffer) {
        const pdfUrl = await uploadInvoicePdf(pdfBuffer, updatedInvoice.invoiceNumber);
        await prisma.invoice.update({
          where: { id: updatedInvoice.id },
          data: { pdfUrl }
        });
      }
    } catch (pdfError) {
      console.error("PDF regeneration failed on update:", pdfError);
    }

    return successResponse(res, updatedInvoice, "Invoice updated successfully");
  } catch (error) {
    console.error("updateInvoice controller error:", error);
    if (error.name === "ZodError") {
      return errorResponse(res, error.errors[0].message, 400, error.errors);
    }
    return errorResponse(res, error.message, 400);
  }
};

//////////////////////////////////////////////////////
// DELETE
//////////////////////////////////////////////////////
exports.deleteInvoice = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { id } = req.params;

    await invoiceService.deleteInvoice(businessId, userId, userEmail, id);
    return successResponse(res, null, "Invoice deleted and stock restored successfully");
  } catch (err) {
    console.error("deleteInvoice controller error:", err);
    return errorResponse(res, err.message, 400);
  }
};

//////////////////////////////////////////////////////
// PREVIEW INVOICE (HTML)
//////////////////////////////////////////////////////
exports.previewInvoice = async (req, res) => {
  try {
    const { designTemplate, customerId, items, ...rest } = req.body;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId: req.business.id },
    });

    const settings = await prisma.settings.findUnique({
      where: { businessId: req.business.id },
    });

    const mockInvoice = {
      ...rest,
      designTemplate: designTemplate || "modern",
      customer: customer || { company: "Customer Name", name: "Customer Name" },
      items: (items || []).map(it => ({
        ...it,
        totalAmount: Number(it.quantity || 0) * Number(it.rate || 0),
        taxDetails: []
      }))
    };

    const html = require("../templates/invoiceTemplate")(mockInvoice, settings || {});
    res.json({ success: true, html });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// GENERATE PDF (MANUAL)
//////////////////////////////////////////////////////
exports.generateInvoicePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business.id;

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId, isDeleted: false },
      include: { customer: true, items: true }
    });

    if (!invoice) {
      return errorResponse(res, "Invoice not found", 404);
    }

    const settings = await prisma.settings.findUnique({ where: { businessId } });
    const pdfSettings = settings || { companyName: "Your Company", signatureUrl: null };

    const pdfBuffer = await generateInvoicePdfHelper(invoice, pdfSettings);
    if (!pdfBuffer) {
      return errorResponse(res, "Failed to generate PDF buffer", 500);
    }

    const pdfUrl = await uploadInvoicePdf(pdfBuffer, invoice.invoiceNumber);
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfUrl },
      include: { customer: true, items: true }
    });

    return successResponse(res, { pdfUrl: updatedInvoice.pdfUrl }, "PDF generated successfully");
  } catch (err) {
    console.error("generateInvoicePdf controller error:", err);
    return errorResponse(res, err.message, 500);
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

    const invoice = await invoiceService.changeStatus(businessId, userId, userEmail, id, status);
    return successResponse(res, invoice, "Invoice status updated successfully");
  } catch (error) {
    console.error("changeStatus controller error:", error);
    return errorResponse(res, error.message, 400);
  }
};

//////////////////////////////////////////////////////
// DOWNLOAD PDF
//////////////////////////////////////////////////////
exports.downloadInvoicePdf = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({ where: { id, businessId } });

    if (!invoice?.pdfUrl) {
      return res.status(404).json({ success: false, message: "PDF not found" });
    }

    return res.redirect(invoice.pdfUrl);
  } catch (err) {
    console.error("downloadInvoicePdf controller error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// BULK UPDATE INVOICES (Regenerate PDFs)
//////////////////////////////////////////////////////
exports.bulkUpdateInvoices = async (req, res) => {
  try {
    const businessId = req.business.id;

    const settings = await prisma.settings.findUnique({ where: { businessId } });
    const pdfSettings = settings || { companyName: "Your Company", signatureUrl: null };

    const invoices = await prisma.invoice.findMany({
      where: { businessId, isDeleted: false },
      include: { customer: true, items: true }
    });

    let updatedCount = 0;
    for (const inv of invoices) {
      try {
        const pdfBuffer = await generateInvoicePdfHelper(inv, pdfSettings);
        if (pdfBuffer) {
          const pdfUrl = await uploadInvoicePdf(pdfBuffer, inv.invoiceNumber);
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { pdfUrl }
          });
          updatedCount++;
        }
      } catch (pdfErr) {
        console.error(`Failed to sync PDF for invoice ${inv.invoiceNumber}:`, pdfErr);
      }
    }

    return successResponse(res, { updatedCount, totalCount: invoices.length }, "Invoices bulk updated successfully");
  } catch (err) {
    console.error("bulkUpdateInvoices controller error:", err);
    return errorResponse(res, err.message, 500);
  }
};