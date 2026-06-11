const { z } = require("zod");

// ==========================================
// VENDOR SCHEMAS
// ==========================================

const createVendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
  isActive: z.boolean().default(true)
});

const updateVendorSchema = createVendorSchema.partial();

// ==========================================
// PURCHASE REQUEST SCHEMAS
// ==========================================

const purchaseRequestItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID").optional().nullable(),
  description: z.string().min(1, "Item description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  estimatedPrice: z.number().nonnegative().default(0)
});

const createPurchaseRequestSchema = z.object({
  department: z.string().optional().nullable(),
  requesterId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseRequestItemSchema).min(1, "At least one item is required")
});

const updatePurchaseRequestSchema = z.object({
  department: z.string().optional().nullable(),
  requesterId: z.string().uuid().optional().nullable(),
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "CONVERTED_TO_PO"]).optional(),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseRequestItemSchema).min(1).optional()
});

// ==========================================
// PURCHASE ORDER SCHEMAS
// ==========================================

const poItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, "Item description is required"),
  itemType: z.enum(["GOODS", "SERVICE"]).default("GOODS"),
  hsnSacCode: z.string().optional().nullable(),
  quantity: z.number().positive("Quantity must be positive"),
  price: z.number().nonnegative("Price cannot be negative"),
  taxPercent: z.number().nonnegative().default(0)
});

const createPurchaseOrderSchema = z.object({
  vendorId: z.string().uuid("Invalid vendor ID"),
  warehouseId: z.string().uuid("Invalid warehouse ID").optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  orderDate: z.coerce.date().optional(),
  expectedDeliveryDate: z.coerce.date().optional().nullable(),
  discount: z.number().nonnegative().default(0),
  notes: z.string().optional().nullable(),
  items: z.array(poItemSchema).min(1, "At least one item is required")
});

const updatePurchaseOrderSchema = createPurchaseOrderSchema.partial();

// ==========================================
// GRN SCHEMAS
// ==========================================

const grnItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantityOrdered: z.number().nonnegative(),
  quantityReceived: z.number().nonnegative("Received quantity cannot be negative"),
  quantityDamaged: z.number().nonnegative().default(0),
  price: z.number().nonnegative().default(0),
  batchNumber: z.string().optional().nullable(),
  serialNumbers: z.array(z.string()).default([])
});

const createGRNSchema = z.object({
  purchaseOrderId: z.string().uuid().optional().nullable(),
  vendorId: z.string().uuid("Invalid vendor ID"),
  warehouseId: z.string().uuid("Invalid warehouse ID"),
  receivedDate: z.coerce.date().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(grnItemSchema).min(1, "At least one item is required")
});

// ==========================================
// BILL SCHEMAS
// ==========================================

const billItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Item name is required"),
  quantity: z.number().positive(),
  price: z.number().nonnegative()
});

const createBillSchema = z.object({
  billNumber: z.string().min(1, "Bill number is required"),
  vendorId: z.string().uuid("Invalid vendor ID"),
  purchaseOrderId: z.string().uuid().optional().nullable(),
  grnId: z.string().uuid().optional().nullable(),
  billDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional().nullable(),
  tax: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  notes: z.string().optional().nullable(),
  items: z.array(billItemSchema).min(1, "At least one item is required")
});

// ==========================================
// PURCHASE RETURN SCHEMAS
// ==========================================

const purchaseReturnItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  description: z.string().optional().nullable(),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  taxPercent: z.number().nonnegative().default(0),
  warehouseId: z.string().uuid().optional().nullable(),
  isStockReturned: z.boolean().default(true)
});

const createPurchaseReturnSchema = z.object({
  vendorId: z.string().uuid("Invalid vendor ID"),
  billId: z.string().uuid().optional().nullable(),
  grnId: z.string().uuid().optional().nullable(),
  reason: z.string().optional().nullable(),
  tax: z.number().nonnegative().default(0),
  warehouseId: z.string().uuid().optional().nullable(),
  items: z.array(purchaseReturnItemSchema).min(1, "At least one item is required")
});

// ==========================================
// INVENTORY SCHEMAS
// ==========================================

const createWarehouseSchema = z.object({
  name: z.string().min(1, "Warehouse name is required"),
  code: z.string().optional().nullable(),
  manager: z.string().optional().nullable(),
  type: z.enum(["STANDARD", "BONDED", "CONSIGNMENT", "VIRTUAL"]).default("STANDARD"),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  isActive: z.boolean().default(true)
});

const adjustmentItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z.number().positive("Quantity must be positive"),
  type: z.enum(["ADD", "SUBTRACT"]),
  batchNumber: z.string().optional().nullable(),
  serialNumbers: z.array(z.string()).default([])
});

const createAdjustmentSchema = z.object({
  warehouseId: z.string().uuid("Invalid warehouse ID"),
  reason: z.string().optional().nullable(),
  adjustmentDate: z.coerce.date().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(adjustmentItemSchema).min(1, "At least one item is required")
});

const transferItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z.number().positive("Quantity must be positive"),
  batchNumber: z.string().optional().nullable(),
  serialNumbers: z.array(z.string()).default([])
});

const createTransferSchema = z.object({
  fromWarehouseId: z.string().uuid("Invalid source warehouse ID"),
  toWarehouseId: z.string().uuid("Invalid destination warehouse ID"),
  transferDate: z.coerce.date().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(transferItemSchema).min(1, "At least one item is required")
});

const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  price: z.number().nonnegative("Price cannot be negative"),
  costPrice: z.number().nonnegative().default(0),
  type: z.enum(["GOODS", "SERVICE"]).default("GOODS"),
  taxCode: z.string().optional().nullable(),
  taxPercent: z.number().nonnegative().default(0),
  unit: z.string().default("pcs"),
  categoryId: z.string().uuid().optional().nullable(),
  brandId: z.string().uuid().optional().nullable(),
  unitId: z.string().uuid().optional().nullable(),
  reorderLevel: z.number().nonnegative().default(0),
  minimumStock: z.number().nonnegative().default(0),
  openingStock: z.number().nonnegative().default(0),
  openingStockWarehouseId: z.string().uuid().optional().nullable(),
  isBatchTracking: z.boolean().default(false),
  isSerialTracking: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

const updateProductSchema = createProductSchema.partial();

module.exports = {
  createVendorSchema,
  updateVendorSchema,
  createPurchaseRequestSchema,
  updatePurchaseRequestSchema,
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  createGRNSchema,
  createBillSchema,
  createPurchaseReturnSchema,
  createWarehouseSchema,
  createAdjustmentSchema,
  createTransferSchema,
  createProductSchema,
  updateProductSchema
};
