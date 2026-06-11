const { z } = require("zod");

// Item validation helper schema
const lineItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, "Item description is required"),
  itemType: z.enum(["GOODS", "SERVICE"]).default("GOODS"),
  hsnSacCode: z.string().optional().nullable(),
  quantity: z.number().optional().default(0),
  price: z.number().nonnegative("Price cannot be negative").optional().default(0),
  taxPercent: z.number().nonnegative("Tax percent cannot be negative").default(0),
  taxDetails: z.array(
    z.object({
      name: z.string(),
      rate: z.number().nonnegative(),
      amount: z.number().nonnegative()
    })
  ).optional().nullable(),
  discount: z.number().nonnegative("Discount cannot be negative").default(0)
});

// 1. Quotation Schema
const createQuotationSchema = z.object({
  title: z.string().optional().nullable(),
  customerId: z.string().uuid("Invalid customer ID"),
  contactId: z.string().uuid("Invalid contact ID").optional().nullable(),
  dealId: z.string().uuid("Invalid deal ID").optional().nullable(),
  assignedToId: z.string().uuid("Invalid assignee ID").optional().nullable(),
  currency: z.string().length(3, "Currency code must be exactly 3 characters").default("INR"),
  termsConditions: z.string().optional().nullable(),
  issueDate: z.string().datetime().optional().or(z.coerce.date()).default(() => new Date()),
  expiryDate: z.string().datetime().optional().or(z.coerce.date()).nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(lineItemSchema).min(1, "At least one line item is required")
});

const updateQuotationSchema = z.object({
  title: z.string().optional().nullable(),
  customerId: z.string().uuid("Invalid customer ID").optional(),
  contactId: z.string().uuid("Invalid contact ID").optional().nullable(),
  dealId: z.string().uuid("Invalid deal ID").optional().nullable(),
  assignedToId: z.string().uuid("Invalid assignee ID").optional().nullable(),
  status: z.enum(["DRAFT", "SENT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "ACCEPTED", "EXPIRED", "CANCELLED"]).optional(),
  currency: z.string().length(3).optional(),
  termsConditions: z.string().optional().nullable(),
  issueDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().nullable().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(lineItemSchema).min(1).optional()
});

// 2. Sales Order Schema
const createSalesOrderSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  contactId: z.string().uuid("Invalid contact ID").optional().nullable(),
  quotationId: z.string().uuid("Invalid quotation ID").optional().nullable(),
  dealId: z.string().uuid("Invalid deal ID").optional().nullable(),
  assignedToId: z.string().uuid("Invalid assignee ID").optional().nullable(),
  currency: z.string().length(3).default("INR"),
  termsConditions: z.string().optional().nullable(),
  orderDate: z.coerce.date().optional().default(() => new Date()),
  deliveryDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(lineItemSchema).min(1, "At least one line item is required")
});

const updateSalesOrderSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID").optional(),
  contactId: z.string().uuid("Invalid contact ID").optional().nullable(),
  quotationId: z.string().uuid("Invalid quotation ID").optional().nullable(),
  dealId: z.string().uuid("Invalid deal ID").optional().nullable(),
  assignedToId: z.string().uuid("Invalid assignee ID").optional().nullable(),
  status: z.enum(["DRAFT", "CONFIRMED", "PROCESSING", "PARTIALLY_FULFILLED", "FULFILLED", "CANCELLED"]).optional(),
  currency: z.string().length(3).optional(),
  termsConditions: z.string().optional().nullable(),
  orderDate: z.coerce.date().optional(),
  deliveryDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(lineItemSchema).min(1).optional()
});

// 3. Invoice Schema
const createInvoiceSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  contactId: z.string().uuid("Invalid contact ID").optional().nullable(),
  quotationId: z.string().uuid("Invalid quotation ID").optional().nullable(),
  salesOrderId: z.string().uuid("Invalid sales order ID").optional().nullable(),
  poNumber: z.string().optional().nullable(),
  poDate: z.preprocess(val => (typeof val === 'string' && val.trim() !== '' ? new Date(val) : undefined), z.date().optional().nullable()),
  soNumber: z.string().optional().nullable(),
  soDate: z.preprocess(val => (typeof val === 'string' && val.trim() !== '' ? new Date(val) : undefined), z.date().optional().nullable()),
  invoiceDate: z.preprocess(val => (typeof val === 'string' && val.trim() !== '' ? new Date(val) : undefined), z.date().optional()),
  dueDate: z.preprocess(val => (typeof val === 'string' && val.trim() !== '' ? new Date(val) : undefined), z.date().optional().nullable()),
  currency: z.string().length(3).default("INR"),
  terms: z.string().optional().nullable(),
  adminNote: z.string().optional().nullable(),
  designTemplate: z.string().default("modern"),
  projectId: z.string().uuid("Invalid project ID").optional().nullable(),
  items: z.array(
    lineItemSchema.extend({
      hours: z.number().optional().default(0), // support existing hours logic
      rate: z.number().optional().default(0)  // support existing rate logic
    })
  ).min(1, "At least one line item is required")
});

const updateInvoiceSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID").optional(),
  contactId: z.string().uuid("Invalid contact ID").optional().nullable(),
  quotationId: z.string().uuid("Invalid quotation ID").optional().nullable(),
  salesOrderId: z.string().uuid("Invalid sales order ID").optional().nullable(),
  status: z.enum([
    "UNPAID", "PARTIALLY_PAID", "DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "PARTIAL_PAID", "PAID", "OVERDUE", "CANCELLED"
  ]).optional(),
  poNumber: z.string().optional().nullable(),
  poDate: z.coerce.date().optional().nullable(),
  soNumber: z.string().optional().nullable(),
  soDate: z.coerce.date().optional().nullable(),
  invoiceDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional().nullable(),
  currency: z.string().length(3).optional(),
  terms: z.string().optional().nullable(),
  adminNote: z.string().optional().nullable(),
  items: z.array(lineItemSchema).min(1).optional()
});

// 4. Payment Schema
const createPaymentSchema = z.object({
  amount: z.number().positive("Payment amount must be greater than 0"),
  paymentDate: z.coerce.date().default(() => new Date()),
  paymentMode: z.enum(["CASH", "BANK_TRANSFER", "UPI", "CREDIT_CARD", "DEBIT_CARD", "CHEQUE", "ONLINE"]),
  transactionId: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  bankReference: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable()
});

// 5. Sales Return Schema
const createSalesReturnSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID").optional().nullable(),
  salesOrderId: z.string().uuid("Invalid sales order ID").optional().nullable(),
  customerId: z.string().uuid("Invalid customer ID"),
  reason: z.string().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      description: z.string().min(1),
      quantity: z.number().positive(),
      price: z.number().nonnegative(),
      taxPercent: z.number().nonnegative().default(0),
      warehouseId: z.string().uuid().optional().nullable(),
      isStockReturned: z.boolean().default(false)
    })
  ).min(1, "At least one line item is required")
});

// 6. Recurring Invoice Schema
const createRecurringInvoiceSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  profileName: z.string().min(1, "Profile name is required"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  currency: z.string().length(3).default("INR"),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(lineItemSchema).min(1, "At least one line item is required")
});

module.exports = {
  createQuotationSchema,
  updateQuotationSchema,
  createSalesOrderSchema,
  updateSalesOrderSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  createPaymentSchema,
  createSalesReturnSchema,
  createRecurringInvoiceSchema
};
