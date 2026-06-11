const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const template = require("../templates/billTemplate");

module.exports = async (payment, bill, settings) => {
  const browser = await puppeteer.launch({
    headless: chromium.headless,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: chromium.args,
  });

  const page = await browser.newPage();

  const html = template(payment, bill, settings);

  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  return pdf;
};