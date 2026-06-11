const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,

  params: async (req, file) => {

    let folder = "business-files";

    //////////////////////////////////////////////////////
    // LOGO
    //////////////////////////////////////////////////////
    if (file.fieldname === "companyLogo") {
      folder = "business-logos";
    }

    //////////////////////////////////////////////////////
    // SIGNATURE
    //////////////////////////////////////////////////////
    if (file.fieldname === "signature") {
      folder = "business-signatures";
    }

    return {
      folder,
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    };
  },
});

const uploadFiles = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = uploadFiles;