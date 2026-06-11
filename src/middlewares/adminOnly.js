const prisma = require("../config/prisma");
const { errorResponse } = require("../utils/response");

const adminOnly = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessId = req.business.id;

    const membership = await prisma.businessUser.findFirst({
      where: {
        userId,
        businessId,
        isActive: true,
      },
      include: { role: true },
    });

    if (!membership || membership.role.name !== "Admin") {
      return errorResponse(res, "Only admin allowed", 403);
    }

    next();
  } catch (error) {
    console.error("adminOnly error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = adminOnly;
