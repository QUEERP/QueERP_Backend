const prisma = require("../config/prisma");
const cloudinary = require("../config/cloudinary");
const generatePdf = require("./generatePdf");
const creditTemplate = require("../templates/creditNoteTemplate");

module.exports = async ({
  invoice = null,
  bill = null,
  businessId,
  extraAmount,
  type = "INVOICE", // 🔥 NEW
}) => {
  try {

    //////////////////////////////////////////////////////
    // CREDIT NUMBER (SEPARATE FOR BILL / INVOICE)
    //////////////////////////////////////////////////////
    const prefix = type === "BILL" ? "BCN" : "CN";

    const last = await prisma.creditNote.findFirst({
      where: { businessId, type },
      orderBy: { createdAt: "desc" },
      select: { creditNumber: true },
    });

    let next = 1;

    if (last?.creditNumber) {
      const lastNum = parseInt(last.creditNumber.split("-")[1]);
      next = lastNum + 1;
    }

    const creditNumber = `${prefix}-${String(next).padStart(3, "0")}`;

    //////////////////////////////////////////////////////
    // CREATE CREDIT NOTE
    //////////////////////////////////////////////////////
    const credit = await prisma.creditNote.create({
      data: {
        businessId,
        customerId: invoice?.customerId || null,
        vendorId: bill?.vendorId || null,
        invoiceId: invoice?.id || null,
        creditNumber,
        type,
        amount: Number(extraAmount),
        remainingAmount: Number(extraAmount),
        reason:
          type === "BILL"
            ? "Bill Overpayment"
            : "Invoice Overpayment",
        status: "OPEN",
      },
    });

    //////////////////////////////////////////////////////
    // FETCH COMPLETE DATA
    //////////////////////////////////////////////////////
    const creditData = await prisma.creditNote.findUnique({
      where: { id: credit.id },
      include: {
        customer: true,
        vendor: true, // 🔥 IMPORTANT
        invoice: {
          include: {
            items: true,
          },
        },
      },
    });

    //////////////////////////////////////////////////////
    // GENERATE PDF
    //////////////////////////////////////////////////////
    const html = creditTemplate(creditData);

    const pdfBuffer = await generatePdf(html);

    //////////////////////////////////////////////////////
    // UPLOAD TO CLOUDINARY
    //////////////////////////////////////////////////////
    const upload = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          public_id: `credit-note-pdfs/${creditNumber}`,
          format: "pdf",
        },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );

      stream.end(pdfBuffer);
    });

    //////////////////////////////////////////////////////
    // SAVE URL
    //////////////////////////////////////////////////////
    const updated = await prisma.creditNote.update({
      where: { id: credit.id },
      data: {
        pdfUrl: upload.secure_url,
      },
      include: {
        customer: true,
        vendor: true,
        invoice: true,
      },
    });

    return updated;

  } catch (error) {
    console.error("Credit Note Creation Error:", error);
    throw new Error("Failed to create credit note");
  }
};