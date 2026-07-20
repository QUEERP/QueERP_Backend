const { htmlToPdfBuffer } = require("./launchBrowser");
const template = require("../templates/billPaymentReceiptTemplate");

/**
 * Generate Bill Payment Receipt PDF
 * @param {object} payment
 * @param {object} bill
 * @param {object} settings
 * @returns {Promise<Buffer>}
 */
module.exports = async (payment, bill, settings) => {
  try {
    console.log("[generateBillPaymentPdf] Generating for payment:", payment?.id);
    const html = template(payment, bill, settings);
    const buffer = await htmlToPdfBuffer(html);
    console.log("[generateBillPaymentPdf] Done, buffer size:", buffer.length);
    return buffer;
  } catch (err) {
    console.error("[generateBillPaymentPdf] Error:", err.stack || err.message);
    throw err;
  }
};