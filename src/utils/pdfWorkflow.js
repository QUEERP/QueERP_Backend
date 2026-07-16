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
          resource_type: "raw", // MUST BE RAW FOR PDF
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

    if (uploadResult.resource_type !== "raw") {
      throw new Error(`Invalid resource_type from Cloudinary: ${uploadResult.resource_type}. Expected "raw".`);
    }

    // 4. Verify Uploaded File via GET request
    console.log(`[PDF Workflow] Verification started...`);
    const verifyRes = await fetch(uploadResult.secure_url);
    if (!verifyRes.ok) {
      throw new Error(`Verification failed: HTTP ${verifyRes.status} for URL: ${uploadResult.secure_url}`);
    }
    const contentType = verifyRes.headers.get("content-type") || "";
    const contentLength = verifyRes.headers.get("content-length");

    console.log(`[PDF Workflow] Verification completed - Status: ${verifyRes.status}, Content-Type: ${contentType}, Content-Length: ${contentLength}`);

    // Cloudinary raw resources may be served as application/octet-stream or application/pdf
    const isValidContentType =
      contentType.includes("application/pdf") ||
      contentType.includes("application/octet-stream") ||
      contentType.includes("binary/octet-stream");

    if (!isValidContentType) {
      await cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: "raw" });
      throw new Error(`Verification failed: Invalid Content-Type: "${contentType}". Expected application/pdf or application/octet-stream.`);
    }

    if (contentLength !== null && Number(contentLength) === 0) {
      await cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: "raw" });
      throw new Error("Verification failed: Content-Length is 0 — file is empty on Cloudinary");
    }

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
