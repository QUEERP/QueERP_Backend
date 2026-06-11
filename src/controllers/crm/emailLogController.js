const prisma = require("../../config/prisma");
const { buildPrismaQuery, getPaginationMeta, logAudit } = require("../../utils/crmHelper");

//////////////////////////////////////////////////////
// LOG EMAIL (CREATE)
//////////////////////////////////////////////////////
exports.logEmail = async (req, res) => {
  try {
    const {
      subject,
      body,
      fromEmail,
      toEmail,
      status = "SENT",
      leadId,
      dealId,
      customerId,
      contactId,
      attachments,
      sentAt,
    } = req.body;

    if (!subject || !body || !fromEmail || !toEmail) {
      return res.status(400).json({
        success: false,
        message: "subject, body, fromEmail, and toEmail are required fields",
      });
    }

    // Verify entity linkages
    if (leadId) {
      const exists = await prisma.lead.findFirst({ where: { id: leadId, businessId: req.business.id, isDeleted: false } });
      if (!exists) return res.status(400).json({ success: false, message: "Lead not found" });
    }
    if (dealId) {
      const exists = await prisma.deal.findFirst({ where: { id: dealId, businessId: req.business.id, isDeleted: false } });
      if (!exists) return res.status(400).json({ success: false, message: "Deal not found" });
    }
    if (customerId) {
      const exists = await prisma.customer.findFirst({ where: { id: customerId, businessId: req.business.id, isDeleted: false } });
      if (!exists) return res.status(400).json({ success: false, message: "Customer Account not found" });
    }
    if (contactId) {
      const exists = await prisma.customerContact.findFirst({ where: { id: contactId, businessId: req.business.id, isDeleted: false } });
      if (!exists) return res.status(400).json({ success: false, message: "Contact not found" });
    }

    const emailLog = await prisma.emailLog.create({
      data: {
        businessId: req.business.id,
        subject,
        body,
        fromEmail,
        toEmail,
        status,
        leadId,
        dealId,
        customerId,
        contactId,
        attachments: attachments || null,
        sentAt: sentAt ? new Date(sentAt) : new Date(),
      },
    });

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "LOG_EMAIL",
      moduleName: "EmailLog",
      recordId: emailLog.id,
      details: { subject: emailLog.subject, toEmail: emailLog.toEmail },
    });

    res.status(201).json({
      success: true,
      emailLog,
    });
  } catch (error) {
    console.error("logEmail error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// GET ALL EMAIL LOGS (PAGINATION, FILTER, SEARCH)
//////////////////////////////////////////////////////
exports.getEmailLogs = async (req, res) => {
  try {
    const { queryOptions, pagination } = buildPrismaQuery(req, {
      searchFields: ["subject", "body", "fromEmail", "toEmail", "status"],
      filterFields: {
        leadId: "leadId",
        dealId: "dealId",
        customerId: "customerId",
        contactId: "contactId",
        status: "status",
      },
    });

    // Email logs don't support soft delete field in database schema (isDeleted is not present in EmailLog model), so we delete it from queryOptions.where
    delete queryOptions.where.isDeleted;

    const totalCount = await prisma.emailLog.count({ where: queryOptions.where });
    const logs = await prisma.emailLog.findMany(queryOptions);

    res.json({
      success: true,
      data: logs,
      pagination: getPaginationMeta(totalCount, pagination.page, pagination.limit),
    });
  } catch (error) {
    console.error("getEmailLogs error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// UPDATE EMAIL LOG STATUS (E.G. TRACK OPENED/DELIVERED)
//////////////////////////////////////////////////////
exports.updateEmailLogStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "status is required" });
    }

    const updated = await prisma.emailLog.updateMany({
      where: { id, businessId: req.business.id },
      data: { status },
    });

    if (updated.count === 0) {
      return res.status(404).json({ success: false, message: "Email log not found" });
    }

    res.json({
      success: true,
      message: "Email delivery status updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
