const prisma = require("../../config/prisma");

const getSalesDashboard = async (businessId) => {
  const now = new Date();

  // 1. Invoice billing summaries (grouped by status)
  const billingSummary = await prisma.invoice.groupBy({
    by: ["status"],
    where: { businessId, isDeleted: false },
    _sum: {
      grandTotal: true,
      subtotal: true
    },
    _count: {
      id: true
    }
  });

  // 2. Outstanding overdue invoices
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      businessId,
      isDeleted: false,
      status: { in: ["UNPAID", "PARTIALLY_PAID", "SENT"] },
      dueDate: { lt: now }
    },
    include: {
      customer: {
        select: {
          id: true,
          company: true,
          phone: true
        }
      }
    },
    orderBy: { dueDate: "asc" },
    take: 10
  });

  // 3. Sales Funnel analytics (quotations conversion status)
  const quoteFunnel = await prisma.quotation.groupBy({
    by: ["status"],
    where: { businessId, isDeleted: false },
    _sum: {
      totalAmount: true
    },
    _count: {
      id: true
    }
  });

  // 4. Sales Order tracking
  const salesOrderTracking = await prisma.salesOrder.groupBy({
    by: ["status"],
    where: { businessId, isDeleted: false },
    _sum: {
      totalAmount: true
    },
    _count: {
      id: true
    }
  });

  // 5. Top-performing customers (Top 5 by gross billings)
  const topCustomersRaw = await prisma.invoice.groupBy({
    by: ["customerId"],
    where: { businessId, isDeleted: false },
    _sum: {
      grandTotal: true
    },
    orderBy: {
      _sum: {
        grandTotal: "desc"
      }
    },
    take: 5
  });

  const topCustomers = [];
  for (const item of topCustomersRaw) {
    if (item.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: item.customerId },
        select: { company: true }
      });
      topCustomers.push({
        customerId: item.customerId,
        name: customer ? customer.company : "Deleted Customer",
        company: customer ? customer.company : null,
        totalSales: item._sum.grandTotal || 0
      });
    }
  }

  // 6. Top selling products (Top 5 by aggregate revenues)
  const topProductsRaw = await prisma.invoiceItem.groupBy({
    by: ["productId", "description"],
    where: {
      invoice: { businessId, isDeleted: false }
    },
    _sum: {
      totalAmount: true,
      quantity: true
    },
    orderBy: {
      _sum: {
        totalAmount: "desc"
      }
    },
    take: 5
  });

  const topProducts = topProductsRaw.map((item) => ({
    productId: item.productId,
    description: item.description,
    totalRevenue: item._sum.totalAmount || 0,
    totalQuantity: item._sum.quantity || 0
  }));

  // 7. Recent Sales Actions (Audit logs)
  const recentLogs = await prisma.auditLog.findMany({
    where: { businessId, module: "SALES" },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  return {
    billingSummary,
    overdueInvoices,
    quoteFunnel,
    salesOrderTracking,
    topCustomers,
    topProducts,
    recentLogs
  };
};

module.exports = {
  getSalesDashboard
};
