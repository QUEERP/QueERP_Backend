const pdfWorkflow = require("./pdfWorkflow");

module.exports = async (pdfBuffer, paymentId) => {
  return await pdfWorkflow(pdfBuffer, `payment-${paymentId}`, "payment-pdfs");
};