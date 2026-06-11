const prisma = require("../../config/prisma");
const { logAction, triggerNotification } = require("./audit.service");
const { generateDocNumber } = require("./quotation.service");

const createCreditNote = async (businessId, userId, userEmail, data) => {
  return await prisma.$transaction(async (tx) => {
    const creditNumber = await generateDocNumber(tx, businessId, "CN", "creditNote", "creditNumber");

    const creditNote = await tx.creditNote.create({
      data: {
        businessId,
        customerId: data.customerId || null,
        invoiceId: data.invoiceId || null,
        vendorId: data.vendorId || null,
        salesReturnId: data.salesReturnId || null,
        creditNumber,
        type: data.type || "INVOICE",
        amount: Number(data.amount || 0),
        remainingAmount: Number(data.amount || 0),
        reason: data.reason || null,
        status: "OPEN"
      }
    });

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "CREDIT_NOTE_CREATED",
      entityType: "CreditNote",
      entityId: creditNote.id,
      details: { creditNumber, amount: creditNote.amount }
    });

    await triggerNotification(tx, {
      businessId,
      title: "Credit Note Generated",
      message: `Credit Note ${creditNumber} of amount ${creditNote.amount} has been issued.`,
      type: "SUCCESS",
      entityType: "CreditNote",
      entityId: creditNote.id
    });

    return creditNote;
  });
};

const getCreditNotesByBusiness = async (businessId) => {
  return await prisma.creditNote.findMany({
    where: { businessId, isDeleted: false },
    include: {
      customer: true,
      invoice: true,
      salesReturn: true
    },
    orderBy: { createdAt: "desc" }
  });
};

const getCreditNoteById = async (businessId, id) => {
  const cn = await prisma.creditNote.findFirst({
    where: { id, businessId, isDeleted: false },
    include: {
      customer: true,
      invoice: true,
      salesReturn: true
    }
  });
  if (!cn) {
    throw new Error("Credit Note not found");
  }
  return cn;
};

const deleteCreditNote = async (businessId, userId, userEmail, id) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.creditNote.findFirst({
      where: { id, businessId, isDeleted: false }
    });
    if (!existing) {
      throw new Error("Credit Note not found");
    }

    await tx.creditNote.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    await logAction(tx, {
      businessId,
      userId,
      userEmail,
      action: "CREDIT_NOTE_DELETED",
      entityType: "CreditNote",
      entityId: id,
      details: { creditNumber: existing.creditNumber }
    });

    return true;
  });
};

module.exports = {
  createCreditNote,
  getCreditNotesByBusiness,
  getCreditNoteById,
  deleteCreditNote
};
