require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const businessRoutes = require("./routes/businessRoutes");
const customerRoutes = require("./routes/customerRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const permissionRoutes = require("./routes/permission.routes");
const userManagementRoutes = require("./routes/userManagementRoutes");
const settingsRoutes = require("./routes/settings");
const checkByEmailRoutes = require("./routes/checkbyemail");
const paymentRoutes = require("./routes/paymentRoutes");
const creditNoteRoutes = require("./routes/creditNoteRoutes");
const moduleRoutes = require("./routes/module.routes");
const customerLedgerRoutes = require("./routes/customerLedgerRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const bankChangeRoutes = require("./routes/bankChangeRoutes");
const overtiemeRoutes = require("./routes/overtimeroutes");
const loanRoutes = require("./routes/loanroutes");
const expenseRoutes = require("./routes/expenseRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const contact = require("./routes/customerContactRoutes");
const contractType = require("./routes/contractTypeRoutes");
const contract = require("./routes/contractRoutes");
const leadRoutes = require("./routes/leadRoutes");
const dealRoutes = require("./routes/dealRoutes");
const activityRoutes = require("./routes/ActivityRoutes");
const quotationRoutes = require("./routes/quotationRoutes");
const salesorderRoutes = require("./routes/salesorderRoutes");
const purchaseOrderRoutes = require("./routes/PORoutes");
const billRoutes = require("./routes/BillRoutes");
const warehouseRoutes = require("./routes/warehouseRoutes");
const stockRoutes = require("./routes/stockRoutes");
const productRoutes = require("./routes/productRoutes");
const accontRoutes = require("./routes/accountRoutes");
const journalEntryRoutes = require("./routes/journalRoutes");
const reportRoutes = require("./routes/reportRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const timesRoutes = require("./routes/timesRoutes");
const invoiceMetaRoutes = require("./routes/invoiceMeta.routes");

// Phase2 (HEAD) routes
const erpRoutes = require("./routes/erpRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const emailLogRoutes = require("./routes/emailLogRoutes");
const legacyCrmTaskRoutes = require("./routes/crmTaskRoutes");
const noteRoutes = require("./routes/noteRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

// origin/main sales module routes
const salesReturnRoutes = require("./routes/salesReturnRoutes");
const recurringInvoiceRoutes = require("./routes/recurringInvoiceRoutes");
const salesReportRoutes = require("./routes/salesReportRoutes");

// Upgraded CRM Routes
const crmNoteRoutes = require("./routes/crm/noteRoutes");
const crmCampaignRoutes = require("./routes/crm/campaignRoutes");
const crmEmailLogRoutes = require("./routes/crm/emailLogRoutes");
const crmReportRoutes = require("./routes/crm/reportRoutes");
const crmTaskRoutes = require("./routes/crm/crmTaskRoutes");

// ── Inventory Module Routes ──────────────────────────────────────────────────
const inventoryWarehouseRoutes = require("./routes/inventory/warehouse.routes");
const inventoryStockRoutes = require("./routes/inventory/stock.routes");
const inventoryReportRoutes = require("./routes/inventory/inventoryReport.routes");

// ── Purchase Module Routes ───────────────────────────────────────────────────
const purchaseVendorRoutes = require("./routes/purchase/vendor.routes");
const purchaseRequestRoutes = require("./routes/purchase/purchaseRequest.routes");
const purchaseOrderV2Routes = require("./routes/purchase/purchaseOrder.routes");
const grnRoutes = require("./routes/purchase/grn.routes");
const vendorBillRoutes = require("./routes/purchase/bill.routes");
const purchaseReturnRoutes = require("./routes/purchase/purchaseReturn.routes");
const purchaseReportRoutes = require("./routes/purchase/purchaseReport.routes");

const app = express();

app.use(cors());
app.use(express.json());

// ── Core Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/purchase", purchaseRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/user-management", userManagementRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/check-email", checkByEmailRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/erp", erpRoutes);
app.use("/api/credit-notes", creditNoteRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/ledger", customerLedgerRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/payrolls", payrollRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/bankchanges", bankChangeRoutes);
app.use("/api/overtime", overtiemeRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/contacts", contact);
app.use("/api/contract-types", contractType);
app.use("/api/contracts", contract);
app.use("/api/leads", leadRoutes);
app.use("/api/deals", dealRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/quotation", quotationRoutes);
app.use("/api/salesorder", salesorderRoutes);
app.use("/api/purchase-order", purchaseOrderRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/products", productRoutes);
app.use("/api/accounts", accontRoutes);
app.use("/api/journal-entries", journalEntryRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/time-entries", timesRoutes);
app.use("/api/invoice-meta", invoiceMetaRoutes);

// ── Phase2 CRM (legacy) ───────────────────────────────────────────────────────
app.use("/api/campaigns", campaignRoutes);
app.use("/api/email-logs", emailLogRoutes);
app.use("/api/crm-tasks", legacyCrmTaskRoutes);
app.use("/api/crm-notes", noteRoutes);
app.use("/api/notifications", notificationRoutes);

// ── Sales Module (origin/main) ────────────────────────────────────────────────
app.use("/api/sales-returns", salesReturnRoutes);
app.use("/api/recurring-invoices", recurringInvoiceRoutes);
app.use("/api/sales-reports", salesReportRoutes);

// ── Upgraded CRM Mounts ───────────────────────────────────────────────────────
app.use("/api/crm-notes", crmNoteRoutes);
app.use("/api/crm-campaigns", crmCampaignRoutes);
app.use("/api/crm-email-logs", crmEmailLogRoutes);
app.use("/api/crm-reports", crmReportRoutes);
app.use("/api/crm-tasks", crmTaskRoutes);

// ── Inventory Module Mounts ──────────────────────────────────────────────────
app.use("/api/inventory/warehouses", inventoryWarehouseRoutes);
app.use("/api/inventory/stock", inventoryStockRoutes);
app.use("/api/inventory/reports", inventoryReportRoutes);

// ── Purchase Module Mounts ───────────────────────────────────────────────────
app.use("/api/purchase/vendors", purchaseVendorRoutes);
app.use("/api/purchase/requests", purchaseRequestRoutes);
app.use("/api/purchase/orders", purchaseOrderV2Routes);
app.use("/api/purchase/grn", grnRoutes);
app.use("/api/purchase/bills", vendorBillRoutes);
app.use("/api/purchase/returns", purchaseReturnRoutes);
app.use("/api/purchase/reports", purchaseReportRoutes);

app.get("/", (req, res) => {
  res.send("QUE Accounting Backend Running...");
});

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

module.exports = app;
