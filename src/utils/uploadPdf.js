const cloudinary = require("../config/cloudinary");

module.exports = async (pdfBuffer, creditNoteNumber) => {
  return new Promise((resolve, reject) => {

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "credit-note-pdfs",
        public_id: creditNoteNumber,
        format: "pdf",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );

    stream.end(pdfBuffer);
  });
};