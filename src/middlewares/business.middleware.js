const prisma = require("../config/prisma");

module.exports = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    //////////////////////////////////////////////////////
    // 1️⃣ READ BUSINESS FROM HEADER
    //////////////////////////////////////////////////////
    const businessId = req.headers["x-business-id"];

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "x-business-id header required",
      });
    }

    //////////////////////////////////////////////////////
    // 2️⃣ CHECK MEMBERSHIP
    //////////////////////////////////////////////////////
    const membership = await prisma.businessUser.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId,
        },
      },
      include: {
        role: true,
        business: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You are not member of this business",
      });
    }

    //////////////////////////////////////////////////////
    // 3️⃣ BUSINESS ACTIVE
    //////////////////////////////////////////////////////
    if (!membership.business.isActive) {
      return res.status(403).json({
        success: false,
        message: "Business inactive",
      });
    }

    //////////////////////////////////////////////////////
    // 4️⃣ SUBSCRIPTION ACTIVE
    //////////////////////////////////////////////////////
    if (
      !membership.business.subscription ||
      membership.business.subscription.status !== "ACTIVE"
    ) {
      return res.status(403).json({
        success: false,
        message: "Subscription inactive",
      });
    }

    //////////////////////////////////////////////////////
    // 5️⃣ ATTACH CONTEXT
    //////////////////////////////////////////////////////
    req.business = membership.business;
    req.membership = membership;

    next();

  } catch (error) {
    console.error("Business middleware error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};