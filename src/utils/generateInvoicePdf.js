const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const invoiceTemplate = require("../templates/invoiceTemplate");

module.exports = async (invoice, settings) => {
  let browser;

  try {
    const execPath =
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      (process.platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : await chromium.executablePath());

    console.log("🔍 Using Chrome at:", execPath);

    browser = await puppeteer.launch({
      executablePath: execPath,

      // 🔥 IMPORTANT FIX
      headless: true,

      // 🔥 IMPORTANT (stability flags)
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    const html = invoiceTemplate(invoice, settings);
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    console.log("✅ PDF size:", pdfBuffer?.length);

    return pdfBuffer;

  } catch (err) {
    // 🔥 FULL ERROR (VERY IMPORTANT)
    console.error("❌ PDF FULL ERROR:", err);
    return null;
  } finally {
    if (browser) await browser.close();
  }
};