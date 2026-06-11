const prisma = require("../../config/prisma");
const { buildPrismaQuery, getPaginationMeta, logAudit } = require("../../utils/crmHelper");

//////////////////////////////////////////////////////
// CREATE NOTE
//////////////////////////////////////////////////////
exports.createNote = async (req, res) => {
  try {
    const {
      content,
      leadId,
      dealId,
      customerId,
      contactId,
      attachments,
    } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "content is required",
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

    const note = await prisma.note.create({
      data: {
        businessId: req.business.id,
        content,
        leadId,
        dealId,
        customerId,
        contactId,
        createdById: req.user.employeeId || null, // Pointing to BusinessUser relation
        attachments: attachments || null,
      },
      include: {
        createdBy: { include: { user: true } },
      },
    });

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "CREATE",
      moduleName: "Note",
      recordId: note.id,
    });

    res.status(201).json({
      success: true,
      note,
    });
  } catch (error) {
    console.error("createNote error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// GET ALL NOTES (WITH PAGINATION, FILTER, SEARCH)
//////////////////////////////////////////////////////
exports.getNotes = async (req, res) => {
  try {
    const { queryOptions, pagination } = buildPrismaQuery(req, {
      searchFields: ["content"],
      filterFields: {
        leadId: "leadId",
        dealId: "dealId",
        customerId: "customerId",
        contactId: "contactId",
        createdById: "createdById",
      },
      relations: {
        createdBy: { select: { id: true, user: { select: { name: true, email: true } } } },
      },
    });

    const totalCount = await prisma.note.count({ where: queryOptions.where });
    const notes = await prisma.note.findMany(queryOptions);

    res.json({
      success: true,
      data: notes,
      pagination: getPaginationMeta(totalCount, pagination.page, pagination.limit),
    });
  } catch (error) {
    console.error("getNotes error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// UPDATE NOTE
//////////////////////////////////////////////////////
exports.updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, attachments } = req.body;

    const existing = await prisma.note.findFirst({
      where: { id, businessId: req.business.id, isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    const note = await prisma.note.update({
      where: { id },
      data: {
        ...(content && { content }),
        ...(attachments !== undefined && { attachments: attachments || null }),
      },
      include: {
        createdBy: { include: { user: true } },
      },
    });

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "UPDATE",
      moduleName: "Note",
      recordId: id,
    });

    res.json({
      success: true,
      note,
    });
  } catch (error) {
    console.error("updateNote error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// SOFT DELETE NOTE
//////////////////////////////////////////////////////
exports.deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.note.updateMany({
      where: {
        id,
        businessId: req.business.id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Note not found or already deleted",
      });
    }

    await logAudit(req.business.id, {
      userId: req.user.userId,
      action: "DELETE_SOFT",
      moduleName: "Note",
      recordId: id,
    });

    res.json({
      success: true,
      message: "Note soft-deleted successfully",
    });
  } catch (error) {
    console.error("deleteNote error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
