const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const template = require("../templates/payslipTemplate");

module.exports = async (payslip, settings) => {
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
    const html = template(payslip, settings);
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    await page.evaluate(async () => {
      const images = Array.from(document.images);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return;
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );
    });

    await new Promise((r) => setTimeout(r, 300));
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    console.log("✅ Payslip PDF size:", pdfBuffer?.length, "bytes");
    return pdfBuffer;

  } catch (err) {
    console.error("❌ Payslip PDF error:", err.message);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
};