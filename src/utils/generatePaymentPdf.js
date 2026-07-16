const { htmlToPdfBuffer } = require("./launchBrowser");
const template = require("../templates/paymentReceiptTemplate");

/**
 * Generate Payment Receipt PDF
 * @param {object} payment
 * @param {object} invoice
 * @param {object} settings
 * @returns {Promise<Buffer>}
 */
module.exports = async (payment, invoice, settings) => {
  try {
    console.log("[generatePaymentPdf] Generating for payment:", payment?.id);
    const html = template(payment, invoice, settings);
    const buffer = await htmlToPdfBuffer(html);
    console.log("[generatePaymentPdf] Done, buffer size:", buffer.length);
    return buffer;
  } catch (err) {
    console.error("[generatePaymentPdf] Error:", err.stack || err.message);
    throw err;
  }
};