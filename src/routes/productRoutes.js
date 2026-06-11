const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const Controller = require("../controllers/productController");

// ==========================================
// CATEGORIES
// ==========================================
router.post("/categories", auth, business, checkPermission("product", "create"), Controller.createCategory);
router.get("/categories", auth, business, Controller.getCategories);
router.get("/categories/:id", auth, business, Controller.getCategoryById);
router.put("/categories/:id", auth, business, checkPermission("product", "edit"), Controller.updateCategory);
router.delete("/categories/:id", auth, business, checkPermission("product", "delete"), Controller.deleteCategory);

// ==========================================
// BRANDS
// ==========================================
router.post("/brands", auth, business, checkPermission("product", "create"), Controller.createBrand);
router.get("/brands", auth, business, Controller.getBrands);
router.put("/brands/:id", auth, business, checkPermission("product", "edit"), Controller.updateBrand);
router.delete("/brands/:id", auth, business, checkPermission("product", "delete"), Controller.deleteBrand);

// ==========================================
// UNITS
// ==========================================
router.post("/units", auth, business, checkPermission("product", "create"), Controller.createUnit);
router.get("/units", auth, business, Controller.getUnits);
router.put("/units/:id", auth, business, checkPermission("product", "edit"), Controller.updateUnit);
router.delete("/units/:id", auth, business, checkPermission("product", "delete"), Controller.deleteUnit);

// ==========================================
// PRODUCTS
// ==========================================

// Search must come before /:id to avoid route shadowing
router.get("/search", auth, business, Controller.searchProducts);

router.post("/", auth, business, checkPermission("product", "create"), Controller.createProduct);
router.get("/", auth, business, Controller.getProducts);
router.get("/:id", auth, business, Controller.getProductById);
router.put("/:id", auth, business, checkPermission("product", "edit"), Controller.updateProduct);
router.delete("/:id", auth, business, checkPermission("product", "delete"), Controller.deleteProduct);

module.exports = router;