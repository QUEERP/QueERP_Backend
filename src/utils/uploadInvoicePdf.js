const pdfWorkflow = require("./pdfWorkflow");

module.exports = async (pdfBuffer, invoiceNumber) => {
  return await pdfWorkflow(pdfBuffer, invoiceNumber, "invoice-pdfs");
};
