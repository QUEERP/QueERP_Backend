const router = require("express").Router();
const authMiddleware  = require("../middlewares/authMiddleware");
const authController = require("../controllers/authController");

// Public routes (no authentication required)
router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/", authController.getAllUsers);
router.get("/me", authMiddleware, authController.getLoggedInUser);
router.put("/update", authMiddleware, authController.updateUser);

// Protected routes (authentication required)
router.use((req, res, next) => {
  console.log("Auth middleware called:", typeof authMiddleware);
  return authMiddleware(req, res, next);
});



module.exports = router;
