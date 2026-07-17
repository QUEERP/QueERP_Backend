const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");
const os = require("os");

module.exports = async (pdfBuffer, documentNumber, folderName = "pdfs") => {
  console.log(`[PDF Workflow] Started for ${documentNumber}`);

  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error("PDF buffer is empty or null");
  }

  // Ensure it's a Buffer
  const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

  // Validate PDF header (%PDF)
  const header = buffer.toString('utf8', 0, 5);
  if (header !== "%PDF-") {
    throw new Error(`Invalid PDF header: ${header}`);
  }

  // Temporary file path
  const tempFilePath = path.join(os.tmpdir(), `${documentNumber}-${Date.now()}.pdf`);

  try {
    // 2. Save temporary file
    const startGen = Date.now();
    fs.writeFileSync(tempFilePath, buffer);
    const stats = fs.statSync(tempFilePath);
    console.log(`[PDF Workflow] PDF generation completed in ${Date.now() - startGen}ms`);
    console.log(`[PDF Workflow] Saved temp file ${tempFilePath}, size: ${stats.size} bytes`);

    if (stats.size === 0) {
      throw new Error("Generated PDF file is 0 bytes");
    }

    // 3. Upload to Cloudinary
    console.log(`[PDF Workflow] Upload started...`);
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        tempFilePath,
        {
          resource_type: "image", // Use image for PDFs to allow public delivery
          folder: folderName,
          public_id: documentNumber,
          overwrite: true,
          unique_filename: true,
          format: "pdf"
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
    });

    console.log(`[PDF Workflow] Upload completed. Cloudinary URL: ${uploadResult.secure_url}`);
    console.log(`[PDF Workflow] Cloudinary Response: resource_type=${uploadResult.resource_type}, format=${uploadResult.format}, bytes=${uploadResult.bytes}`);

    // Allow both image and raw, depending on Cloudinary account settings
    if (uploadResult.resource_type !== "image" && uploadResult.resource_type !== "raw") {
      console.warn(`[PDF Workflow] Unexpected resource_type from Cloudinary: ${uploadResult.resource_type}. Continuing anyway.`);
    }

    // 4. Verification Step Skipped (Cloudinary security policies may block unauthenticated GET requests with 401)
    console.log(`[PDF Workflow] Skipping HTTP verification due to potential Cloudinary strict delivery policies.`);

    // 5. Cleanup temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    console.log(`[PDF Workflow] Completed successfully for ${documentNumber}`);

    return uploadResult.secure_url;
  } catch (error) {
    console.error(`[PDF Workflow] Exception:`, error.stack || error.message);
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log(`[PDF Workflow] Cleaned up temporary file due to failure`);
    }
    throw error;
  }
};
