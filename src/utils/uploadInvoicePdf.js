const cloudinary = require("../config/cloudinary");

module.exports = async (pdfBuffer, invoiceNumber) => {
  console.log("Starting PDF upload for invoice:", invoiceNumber);
  console.log("PDF buffer size:", pdfBuffer ? pdfBuffer.length : "null");
  
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error("PDF buffer is empty or null — cannot upload");
  }
  
  return new Promise((resolve, reject) => {
    console.log("Cloudinary config check:", {
      cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
      api_key: !!process.env.CLOUDINARY_API_KEY,
      api_secret: !!process.env.CLOUDINARY_API_SECRET
    });

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw", // 🔥 REQUIRED FOR PDF
        folder: "invoice-pdfs",
        public_id: invoiceNumber,
        format: "pdf",
      },
      (error, result) => {
        console.log("Cloudinary callback - error:", !!error, "result:", !!result);
        
        if (error) {
          console.error("Cloudinary upload error details:", error);
          return reject(error);
        }
        
        if (!result) {
          console.error("Cloudinary returned null result");
          return reject(new Error("Cloudinary returned null result"));
        }
        
        console.log("Cloudinary upload successful:", result.secure_url);
        resolve(result.secure_url);
      }
    );

    stream.on('error', (error) => {
      console.error("Stream error:", error);
      reject(error);
    });

    stream.end(pdfBuffer);
  });
};
