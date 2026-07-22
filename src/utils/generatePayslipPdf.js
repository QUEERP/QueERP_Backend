const { htmlToPdfBuffer } = require("./launchBrowser");
const template = require("../templates/payslipTemplate");

module.exports = async (payslip, settings) => {
  const html = template(payslip, settings);
  const pdf = await htmlToPdfBuffer(html, {
    format: "A4",
    printBackground: true,
  });
  return pdf;
};