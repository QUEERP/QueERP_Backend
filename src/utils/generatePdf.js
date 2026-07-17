const { htmlToPdfBuffer } = require("./launchBrowser");

/**
 * Generic HTML-to-PDF generator (used by ledger, credit notes, etc.)
 * @param {string} html
 * @returns {Promise<Buffer>}
 */
module.exports = async (html) => {
  try {
    console.log("[generatePdf] Starting...");
    const buffer = await htmlToPdfBuffer(html);
    console.log("[generatePdf] Done, buffer size:", buffer.length);
    return buffer;
  } catch (err) {
    console.error("[generatePdf] Error:", err.stack || err.message);
    throw err;
  }
};