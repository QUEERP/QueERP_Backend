const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware");
const businessController = require("../controllers/businessController");

router.post("/create", authMiddleware, businessController.createBusiness);
router.get("/", authMiddleware, businessController.getMyData);
router.get("/:id", authMiddleware, businessController.getBusinessById)
module.exports = router;
