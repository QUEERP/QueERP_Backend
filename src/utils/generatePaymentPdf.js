const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const template = require("../templates/paymentReceiptTemplate");

module.exports = async (payment, invoice, settings) => {
  let browser;
  try {
    const execPath = process.env.NODE_ENV !== "production"
      ? (process.platform === "win32"
          ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
          : "/usr/bin/google-chrome")
      : await chromium.executablePath();

    browser = await puppeteer.launch({
      headless: chromium.headless,
      executablePath: execPath,
      args: chromium.args,
    });

    const page = await browser.newPage();
    const html = template(payment, invoice, settings);
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 1000));

    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    console.log("✅ Payment PDF size:", pdfBuffer?.length, "bytes");
    return pdfBuffer;

  } catch (err) {
    console.error("❌ Payment PDF error:", err.message);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
};