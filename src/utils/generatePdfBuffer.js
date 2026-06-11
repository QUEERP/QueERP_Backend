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

    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    console.log("✅ Ledger PDF size:", buffer?.length, "bytes");
    return buffer;

  } catch (err) {
    console.error("❌ Ledger PDF error:", err.message);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
};