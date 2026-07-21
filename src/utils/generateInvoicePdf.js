const prisma = require("../config/prisma");
const { htmlToPdfBuffer } = require("./launchBrowser");
const invoiceTemplate = require("../templates/invoiceTemplate");

/**
 * Generate Invoice PDF
 * @param {object} invoice
 * @param {object} settings
 * @returns {Promise<Buffer>}
 */
module.exports = async (invoice, settings) => {
  try {
    console.log("[generateInvoicePdf] Generating for invoice:", invoice?.invoiceNumber);
    if (invoice?.businessId) {
      const business = await prisma.business.findUnique({ where: { id: invoice.businessId } });
      if (business && settings) {
        settings.businessType = business.businessType;
      }
    }
    const html = invoiceTemplate(invoice, settings);
    const buffer = await htmlToPdfBuffer(html);
    console.log("[generateInvoicePdf] Done, buffer size:", buffer.length);
    return buffer;
  } catch (err) {
    console.error("[generateInvoicePdf] Error:", err.stack || err.message);
    throw err; // Re-throw — caller decides what to do
  }
};