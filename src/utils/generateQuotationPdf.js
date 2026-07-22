const { htmlToPdfBuffer } = require("./launchBrowser");
const quotationTemplate = require("../templates/quotationTemplate");

const generateQuotationPdf = async (quotation, settings) => {
  const htmlContent = quotationTemplate(quotation, settings);

  const pdfBuffer = await htmlToPdfBuffer(htmlContent, {
    format: "A4",
    printBackground: true,
  });

  return pdfBuffer;
};

module.exports = generateQuotationPdf;
