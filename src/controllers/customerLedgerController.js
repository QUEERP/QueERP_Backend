const prisma = require("../config/prisma");
const generatePdf = require("../utils/generatePdfBuffer");
const ledgerTemplate = require("../templates/ledgerPdfTemplate");
const cloudinary = require("../config/cloudinary");

////////////////////////////////////////////////////////
// COMMON LEDGER DATA FUNCTION
////////////////////////////////////////////////////////
const getCustomerLedgerData = async (
  businessId,
  customerId,
  fromDate,
  toDate
) => {

const start = new Date(fromDate);
start.setHours(0, 0, 0, 0);

const end = new Date(toDate);
end.setHours(23, 59, 59, 999);

  if (isNaN(start) || isNaN(end)) {
    throw new Error("Invalid date format");
  }

  //////////////////////////////////////////////////////
  // INVOICES (DEBIT)
  //////////////////////////////////////////////////////
  const invoices = await prisma.invoice.findMany({
    where: {
      businessId,
      customerId,
      createdAt: { gte: start, lte: end }
    },
    select: {
      invoiceNumber: true,
      grandTotal: true,
      createdAt: true,
      dueDate: true
    }
  });

  //////////////////////////////////////////////////////
  // PAYMENTS (CREDIT)
  //////////////////////////////////////////////////////
  const payments = await prisma.payment.findMany({
    where: {
      businessId,
      invoice: { customerId },
      paymentDate: { gte: start, lte: end }
    },
    select: {
      paymentNumber: true,
      amount: true,
      paymentDate: true,
      invoice: {
        select: {
          invoiceNumber: true
        }
      }
    }
  });

  //////////////////////////////////////////////////////
  // CREDIT NOTES (CREDIT)
  //////////////////////////////////////////////////////
  const creditNotes = await prisma.creditNote.findMany({
    where: {
      businessId,
      customerId,
      createdAt: { gte: start, lte: end }
    },
    select: {
      creditNumber: true,
      amount: true,
      createdAt: true
    }
  });

  //////////////////////////////////////////////////////
  // BUILD LEDGER
  //////////////////////////////////////////////////////
  let ledger = [];

  invoices.forEach(inv => {
    ledger.push({
      date: inv.createdAt,
      details: `Invoice ${inv.invoiceNumber} - due on ${
        inv.dueDate
          ? new Date(inv.dueDate).toISOString().split("T")[0]
          : "-"
      }`,
      debit: Number(inv.grandTotal) || 0,
      credit: 0
    });
  });

  payments.forEach(pay => {
    ledger.push({
      date: pay.paymentDate,
      details: `Payment (${pay.paymentNumber}) to invoice ${pay.invoice.invoiceNumber}`,
      debit: 0,
      credit: Number(pay.amount) || 0
    });
  });

  creditNotes.forEach(cr => {
    ledger.push({
      date: cr.createdAt,
      details: `Credit Note ${cr.creditNumber}`,
      debit: 0,
      credit: Number(cr.amount) || 0
    });
  });

  //////////////////////////////////////////////////////
  // SORT BY DATE
  //////////////////////////////////////////////////////
  ledger.sort((a, b) => new Date(a.date) - new Date(b.date));

  //////////////////////////////////////////////////////
  // RUNNING BALANCE
  //////////////////////////////////////////////////////
  let balance = 0;

  const finalLedger = ledger.map(row => {
   balance = Number((balance + row.debit - row.credit).toFixed(2));
    return {
      ...row,
      balance
    };
  });

  return {
    fromDate,
    toDate,
    closingBalance: balance,
    data: finalLedger
  };
};

////////////////////////////////////////////////////////
// GET CUSTOMER LEDGER
////////////////////////////////////////////////////////
exports.getCustomerLedger = async (req, res) => {
  try {

    const businessId = req.business.id;
    const { customerId } = req.params;
    let { fromDate, toDate } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "fromDate and toDate required"
      });
    }

    //////////////////////////////////////////////////////
    // LIMIT TO DATE TO TODAY
    //////////////////////////////////////////////////////
    const today = new Date().toISOString().split("T")[0];

    if (toDate > today) {
      toDate = today;
    }

    const ledger = await getCustomerLedgerData(
      businessId,
      customerId,
      fromDate,
      toDate
    );

    res.json({
      success: true,
      ...ledger
    });

  } catch (error) {
    console.error("LEDGER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Ledger fetch failed"
    });
  }
};

////////////////////////////////////////////////////////
// GENERATE STATEMENT PDF + RETURN URL
////////////////////////////////////////////////////////
exports.getCustomerStatementPdf = async (req, res) => {
  try {

    const businessId = req.business.id;
    const { customerId } = req.params;
    let { fromDate, toDate } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "fromDate and toDate required"
      });
    }

    //////////////////////////////////////////////////////
    // LIMIT TO DATE TO TODAY
    //////////////////////////////////////////////////////
    const today = new Date().toISOString().split("T")[0];

    if (toDate > today) {
      toDate = today;
    }

    //////////////////////////////////////////////////////
    // LEDGER DATA
    //////////////////////////////////////////////////////
    const ledger = await getCustomerLedgerData(
      businessId,
      customerId,
      fromDate,
      toDate
    );

    //////////////////////////////////////////////////////
    // CUSTOMER
    //////////////////////////////////////////////////////
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { company: true }
    });

    //////////////////////////////////////////////////////
    // GENERATE HTML
    //////////////////////////////////////////////////////
    const html = ledgerTemplate({ customer, ledger });

    //////////////////////////////////////////////////////
    // GENERATE PDF BUFFER
    //////////////////////////////////////////////////////
    const pdfBuffer = await generatePdf(html);

    //////////////////////////////////////////////////////
    // UPLOAD TO CLOUDINARY
    //////////////////////////////////////////////////////
    const upload = await new Promise((resolve, reject) => {

      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          public_id: `statements/customer-${customerId}-${Date.now()}`,
          format: "pdf"
        },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );

      stream.end(pdfBuffer);
    });

    //////////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////////
    res.json({
      success: true,
      pdfUrl: upload.secure_url
    });

  } catch (error) {
    console.error("STATEMENT ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Statement generation failed"
    });
  }
};