const { htmlToPdfBuffer } = require("./launchBrowser");
const template = require("../templates/billTemplate");

module.exports = async (payment, bill, settings) => {
  const html = template(payment, bill, settings);
  const pdf = await htmlToPdfBuffer(html, {
    format: "A4",
    printBackground: true,
  });
  return pdf;
};