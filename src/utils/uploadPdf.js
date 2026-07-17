const pdfWorkflow = require("./pdfWorkflow");

module.exports = async (pdfBuffer, creditNoteNumber) => {
  return await pdfWorkflow(pdfBuffer, creditNoteNumber, "credit-note-pdfs");
};