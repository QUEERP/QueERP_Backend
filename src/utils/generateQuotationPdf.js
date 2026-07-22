const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const quotationTemplate = require("../templates/quotationTemplate");

const generateQuotationPdf = async (quotation, settings) => {
  const htmlContent = quotationTemplate(quotation, settings);

  const execPath = process.env.NODE_ENV !== "production"
    ? (process.platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : "/usr/bin/google-chrome")
    : await chromium.executablePath();

  const browser = await puppeteer.launch({
    executablePath: execPath,
    args: chromium.args,
    headless: chromium.headless,
    defaultViewport: chromium.defaultViewport,
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  return pdfBuffer;
};

module.exports = generateQuotationPdf;
