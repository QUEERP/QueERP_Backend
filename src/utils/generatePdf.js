const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

module.exports = async (html) => {
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
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    console.log("✅ PDF size:", pdfBuffer?.length, "bytes");
    return pdfBuffer;

  } catch (err) {
    console.error("❌ PDF error:", err.message);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
};