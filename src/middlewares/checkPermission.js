  const prisma = require("../config/prisma");
  const { errorResponse } = require("../utils/response");

  const checkPermission = (moduleName, action) => {
    return async (req, res, next) => {
      try {

        const userId = req.user.userId || req.user.id;
        const businessId = req.business.id;

        ////////////////////////////////////////////////////
        // 1️⃣ BUSINESS OWNER BYPASS (FULL ACCESS)
        ////////////////////////////////////////////////////
        const business = await prisma.business.findUnique({
          where: { id: businessId },
          select: { ownerId: true },
        });

        if (business.ownerId === userId) {
          return next(); // ✅ OWNER CAN DO EVERYTHING
        }

        ////////////////////////////////////////////////////
        // 2️⃣ NORMAL USER PERMISSION CHECK
        ////////////////////////////////////////////////////
        const permission = await prisma.userPermission.findFirst({
          where: {
            businessUser: {
              userId,
              businessId,
              isActive: true,
            },
            permission: {
              action,
              module: {
                name: moduleName,
              },
            },
          },
        });

        if (!permission) {
          return errorResponse(
            res,
            `Permission denied (${moduleName}:${action})`,
            403
          );
        }

        next();
      } catch (err) {
        console.error("Permission Error:", err);
        return errorResponse(res, "Internal server error", 500);
      }
    };
  };

  module.exports = checkPermission;