const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const template = require("../templates/billPaymentReceiptTemplate");

module.exports = async (payment, bill, settings) => {
  let browser;

  try {
    const execPath =
      process.env.NODE_ENV !== "production"
        ? process.platform === "win32"
          ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
          : "/usr/bin/google-chrome"
        : await chromium.executablePath();

    browser = await puppeteer.launch({
      headless: chromium.headless,
      executablePath: execPath,
      args: chromium.args,
    });

    const page = await browser.newPage();

    const html = template(payment, bill, settings);

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    return pdfBuffer;

  } catch (err) {
    console.error("Bill PDF error:", err);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
};