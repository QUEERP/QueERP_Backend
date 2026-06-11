const cloudinary = require("../config/cloudinary");

module.exports = async (pdfBuffer, paymentId) => {

  return new Promise((resolve, reject) => {

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        public_id: `payment-pdfs/payment-${paymentId}`,
        format: "pdf",
        timeout: 600000, // ✅ 10 minutes
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Upload Error:", error);
          return reject(error);
        }

        resolve(result.secure_url);
      }
    );

    stream.end(pdfBuffer);
  });
};