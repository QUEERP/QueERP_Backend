const prisma = require("../config/prisma");
const { errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// CREDIT NOTE ACCESS CONTROL
//////////////////////////////////////////////////////

const creditNoteAccess = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const businessId = req.business.id;

    ////////////////////////////////////////////////////
    // OWNER CHECK
    ////////////////////////////////////////////////////
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (business.ownerId === userId) {
      return next();
    }

    ////////////////////////////////////////////////////
    // CREDIT NOTE ID FROM PARAM
    ////////////////////////////////////////////////////
    const creditNoteId = req.params.id;

    const creditNote = await prisma.creditNote.findFirst({
      where: {
        id: creditNoteId,
        businessId,
      },
      include: {
        invoice: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!creditNote) {
      return errorResponse(res, "Credit note not found", 404);
    }

    ////////////////////////////////////////////////////
    // CHECK IF USER CREATED PAYMENT
    ////////////////////////////////////////////////////
    const isPaymentCreator = creditNote.invoice.payments.some(
      (payment) => payment.createdBy === userId
    );

    if (!isPaymentCreator) {
      return errorResponse(res, "Access denied", 403);
    }

    next();
  } catch (err) {
    console.error(err);
    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = creditNoteAccess;