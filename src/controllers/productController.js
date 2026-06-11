const prisma = require("../config/prisma");
const { fixProduct } = require("../utils/dataFixer");
const ProductWorkflow = require("../services/productWorkflow");
const productService = require("../services/inventory/product.service");

// ==========================================
// CATEGORY CONTROLLER


// ==========================================

exports.createCategory = async (req, res) => {
  try {
    const category = await productService.createCategory(
      req.business.id,
      req.user.id,
      req.user.email,
      req.body
    );
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await productService.getCategories(req.business.id, req.query);
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await productService.getCategoryById(req.business.id, req.params.id);
    res.json({ success: true, category });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await productService.updateCategory(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.id,
      req.body
    );
    res.json({ success: true, category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await productService.deleteCategory(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.id
    );
    res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ==========================================
// BRAND CONTROLLER
// ==========================================

exports.createBrand = async (req, res) => {
  try {
    const brand = await productService.createBrand(
      req.business.id,
      req.user.id,
      req.user.email,
      req.body
    );
    res.status(201).json({ success: true, brand });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getBrands = async (req, res) => {
  try {
    const brands = await productService.getBrands(req.business.id, req.query);
    res.json({ success: true, brands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const brand = await productService.updateBrand(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.id,
      req.body
    );
    res.json({ success: true, brand });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    await productService.deleteBrand(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.id
    );
    res.json({ success: true, message: "Brand deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ==========================================
// UNIT CONTROLLER
// ==========================================

exports.createUnit = async (req, res) => {
  try {
    const unit = await productService.createUnit(
      req.business.id,
      req.user.id,
      req.user.email,
      req.body
    );
    res.status(201).json({ success: true, unit });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getUnits = async (req, res) => {
  try {
    const units = await productService.getUnits(req.business.id, req.query);
    res.json({ success: true, units });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUnit = async (req, res) => {
  try {
    const unit = await productService.updateUnit(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.id,
      req.body
    );
    res.json({ success: true, unit });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteUnit = async (req, res) => {
  try {
    await productService.deleteUnit(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.id
    );
    res.json({ success: true, message: "Unit deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ==========================================
// PRODUCT CONTROLLER
// ==========================================

exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      sku,
      price,
      costPrice,
      type,
      taxCode,
      unit = "pcs",
      taxPercent = 0,
      initialQty = 0,
      warehouseId
    } = req.body;

    if (!name || !sku || !price || !type) {
      return res.status(400).json({
        success: false,
        message: "name, sku, price and type are required",
      });
    }

    const product = await ProductWorkflow.createProduct({
      businessId: req.business.id,
      name,
      description,
      sku,
      price: Number(price),
      costPrice: Number(costPrice || 0),
      type,
      hsnCode: taxCode,
      taxPercent: Number(taxPercent),
      unit,
      initialQty: Number(initialQty),
      warehouseId,
      performedBy: req.user.userId
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// SEARCH PRODUCTS (For Dropdown)
//////////////////////////////////////////////////////
exports.searchProducts = async (req, res) => {
  try {
    const { q, warehouseId } = req.query;

    const products = await prisma.product.findMany({
      where: {
        businessId: req.business.id,
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } }
        ]
      },
      include: {
        stock: {
          where: warehouseId ? { warehouseId } : undefined
        }
      },
      take: 20
    });

    const formatted = products.map(p => {
      const totalStock = p.stock.reduce((sum, s) => sum + (s.quantity - s.reservedQty), 0);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        description: p.description,
        price: p.price,
        unit: p.unit,
        taxCode: p.taxCode,
        taxPercent: p.taxPercent,
        availableStock: totalStock,
        stockDetails: p.stock
      };
    });

    res.json({ success: true, products: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    // Use service-layer if available (main branch), fallback to direct Prisma query
    if (productService.getProducts) {
      const result = await productService.getProducts(req.business.id, req.query);
      return res.json({ success: true, ...result });
    }

    const products = await prisma.product.findMany({
      where: { businessId: req.business.id },
      include: {
        categories: true,
        brands: true,
        units: true,
        stock: true
      }
    });

    const formattedProducts = products.map(p => fixProduct(p));
    res.json({ success: true, products: formattedProducts });
  } catch (error) {
    console.error("getProducts error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    if (productService.getProductById) {
      const product = await productService.getProductById(req.business.id, req.params.id);
      return res.json({ success: true, product });
    }

    const product = await prisma.product.findFirst({
      where: { id: req.params.id, businessId: req.business.id },
      include: { categories: true, brands: true, units: true, stock: true }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, product: fixProduct(product) });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    if (productService.updateProduct) {
      const product = await productService.updateProduct(
        req.business.id,
        req.user.id,
        req.user.email,
        req.params.id,
        req.body
      );
      return res.json({ success: true, product });
    }

    const { id } = req.params;
    const { type } = req.body;

    if (type && !["GOODS", "SERVICE"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }

    const allowedFields = [
      "name", "description", "sku", "price", "costPrice", "taxPercent",
      "unit", "isActive", "taxCode", "type", "attachments", "barcode",
      "brandId", "categoryId", "image", "isBatchTracking", "isSerialTracking",
      "minimumStock", "openingStock", "reorderLevel", "unitId"
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    if (req.body.sellingPrice !== undefined) updateData.price = req.body.sellingPrice;
    if (req.body.taxRate !== undefined) updateData.taxPercent = req.body.taxRate;
    if (req.body.hsnCode !== undefined) updateData.taxCode = req.body.hsnCode;

    const updated = await prisma.product.updateMany({
      where: { id, businessId: req.business.id },
      data: updateData,
    });

    if (updated.count === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, message: "Product updated" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await productService.deleteProduct(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.id
    );
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};