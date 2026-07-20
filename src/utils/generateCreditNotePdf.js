const { htmlToPdfBuffer } = require("./launchBrowser");
const template = require("../templates/creditNoteTemplate");

/**
 * Generate Credit Note PDF
 * @param {object} credit
 * @param {object} settings
 * @returns {Promise<Buffer>}
 */
module.exports = async (credit, settings) => {
  try {
    console.log("[generateCreditNotePdf] Generating for credit note:", credit?.id);
    const html = template(credit, settings);
    const buffer = await htmlToPdfBuffer(html);
    console.log("[generateCreditNotePdf] Done, buffer size:", buffer.length);
    return buffer;
  } catch (err) {
    console.error("[generateCreditNotePdf] Error:", err.stack || err.message);
    throw err;
  }
};
