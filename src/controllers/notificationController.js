const prisma = require("../config/prisma");

exports.getNotifications = async (req, res) => {
  try {
    const businessId = req.business.id;
    const notifications = [];
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Low stock & Out of stock
    const stocks = await prisma.stock.findMany({
      where: { warehouse: { businessId } },
      include: { product: true }
    });

    stocks.forEach(s => {
      const remaining = s.quantity - (s.reservedQty || 0);
      if (remaining <= 0) {
        notifications.push({
          id: `stock-out-${s.id}`,
          type: 'alert',
          title: 'Out of Stock',
          message: `${s.product?.name || 'Product'} is out of stock in ${s.warehouse?.name || 'warehouse'}.`,
          link: `/dashboard/${businessId}/reorder-alerts`,
          date: new Date().toISOString(),
          module: 'inventory'
        });
      } else if (remaining <= (s.product?.reorderLevel || 0)) {
        notifications.push({
          id: `stock-low-${s.id}`,
          type: 'warning',
          title: 'Low Stock',
          message: `${s.product?.name || 'Product'} is running low (${remaining} left).`,
          link: `/dashboard/${businessId}/reorder-alerts`,
          date: new Date().toISOString(),
          module: 'inventory'
        });
      }
    });

    // 2. Invoice Due
    const invoices = await prisma.invoice.findMany({
      where: {
        businessId,
        status: { in: ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PARTIAL_PAID', 'UNPAID', 'PENDING_APPROVAL', 'APPROVED'] },
        dueDate: { lte: nextWeek }
      }
    });

    invoices.forEach(inv => {
      const isOverdue = inv.dueDate < today;
      notifications.push({
        id: `inv-${inv.id}`,
        type: isOverdue ? 'alert' : 'info',
        title: isOverdue ? 'Invoice Overdue' : 'Invoice Due Soon',
        message: `Invoice ${inv.invoiceNumber} is ${isOverdue ? 'overdue' : 'due on ' + inv.dueDate.toLocaleDateString()}.`,
        link: `/dashboard/${businessId}/invoices`,
        date: inv.dueDate.toISOString(),
        module: 'sales'
      });
    });

    // 3. Lead Reminders (Lead due data)
    const leadReminders = await prisma.leadReminder.findMany({
      where: {
        lead: { businessId },
        date: { lte: nextWeek }
      },
      include: { lead: true }
    });

    leadReminders.forEach(r => {
      const isOverdue = r.date < today;
      notifications.push({
        id: `lead-rem-${r.id}`,
        type: isOverdue ? 'warning' : 'info',
        title: 'Lead Follow-up',
        message: `Reminder for lead ${r.lead.name}: ${r.title}`,
        link: `/dashboard/${businessId}/leads/${r.lead.id}`,
        date: r.date.toISOString(),
        module: 'crm'
      });
    });

    // 4. Meetings
    const activities = await prisma.activity.findMany({
      where: {
        businessId,
        type: 'Meeting',
        activityDate: { lte: endOfToday, gte: new Date(today.setHours(0, 0, 0, 0)) }
      }
    });

    activities.forEach(a => {
      notifications.push({
        id: `meeting-${a.id}`,
        type: 'info',
        title: 'Meeting Today',
        message: `${a.title} is scheduled for today.`,
        link: `/dashboard/${businessId}/activities`, // Assuming activities page
        date: a.activityDate.toISOString(),
        module: 'crm'
      });
    });

    // 5. Purchase Orders
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        businessId,
        status: { in: ['DRAFT', 'PENDING_APPROVAL'] },
        expectedDeliveryDate: { lte: nextWeek }
      }
    });

    purchaseOrders.forEach(po => {
      const isOverdue = po.expectedDeliveryDate && po.expectedDeliveryDate < today;
      notifications.push({
        id: `po-${po.id}`,
        type: isOverdue ? 'warning' : 'info',
        title: 'Purchase Order Follow-up',
        message: `Purchase Order ${po.poNumber} is ${isOverdue ? 'overdue for delivery' : 'expected soon'}.`,
        link: `/dashboard/${businessId}/purchase-orders`,
        date: (po.expectedDeliveryDate || po.createdAt).toISOString(),
        module: 'purchases'
      });
    });

    // Sort by date descending (most urgent/recent first)
    notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ success: true, notifications });
  } catch (error) {
    console.error("Notifications error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
