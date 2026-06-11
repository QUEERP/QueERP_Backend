const router = require("express").Router();

const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");

const controller = require ("../controllers/settings")
const uploadLogo = require("../middlewares/uploadLogo");


//////////////////////////////////////////////////////
// GLOBAL MIDDLEWARE
//////////////////////////////////////////////////////
router.use(authMiddleware);
router.use(businessMiddleware);

//////////////////////////////////////////////////////
// SETTINGS ROUTES
//////////////////////////////////////////////////////

// GET SETTINGS
router.get(
  "/",
  checkPermission("settings", "read"),
  controller.getSettings
);

router.post(
  "/",
  authMiddleware,
  businessMiddleware,
  uploadLogo.fields([
    { name: "companyLogo", maxCount: 1 },
    { name: "signature", maxCount: 1 }
  ]),
  checkPermission("settings", "update"),
  controller.saveSettings
);

module.exports = router;
