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
    const html = invoiceTemplate(invoice, settings);
    const buffer = await htmlToPdfBuffer(html);
    console.log("[generateInvoicePdf] Done, buffer size:", buffer.length);
    return buffer;
  } catch (err) {
    console.error("[generateInvoicePdf] Error:", err.stack || err.message);
    throw err; // Re-throw — caller decides what to do
  }
};