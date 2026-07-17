const { htmlToPdfBuffer } = require("./launchBrowser");

/**
 * Generic HTML-to-PDF generator (used by ledger reports)
 * @param {string} html
 * @returns {Promise<Buffer>}
 */
module.exports = async (html) => {
  try {
    console.log("[generatePdfBuffer] Starting...");
    const buffer = await htmlToPdfBuffer(html);
    console.log("[generatePdfBuffer] Done, buffer size:", buffer.length);
    return buffer;
  } catch (err) {
    console.error("[generatePdfBuffer] Error:", err.stack || err.message);
    throw err;
  }
};