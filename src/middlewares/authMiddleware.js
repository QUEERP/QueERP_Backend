const prisma = require("../config/prisma");
const { verifyToken, extractTokenFromHeader } = require("../utils/jwtUtils");

const authMiddleware = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { success, payload, error } = verifyToken(token);

    if (!success) {
      return res.status(401).json({
        success: false,
        message: error?.message || "Invalid token",
      });
    }

    //////////////////////////////////////////////////////
    // REQUIRED PAYLOAD VALIDATION
    //////////////////////////////////////////////////////
    if (!payload.userId || !payload.email || !payload.role) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    //////////////////////////////////////////////////////
    // ⭐ SUBSCRIPTION ADMIN
    //////////////////////////////////////////////////////
    if (payload.userId === "subscription-admin") {
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        isActive: true,
        activeBusinessId: null,
        employeeId: null
      };

      return next();
    }

    //////////////////////////////////////////////////////
    // NORMAL USER
    //////////////////////////////////////////////////////
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        activeBusinessId: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    //////////////////////////////////////////////////////
    // ⭐ CHECK IF USER IS EMPLOYEE
    //////////////////////////////////////////////////////
    const employee = await prisma.employee.findFirst({
      where: {
        userId: user.id
      },
      select: {
        id: true
      }
    });

    //////////////////////////////////////////////////////
    // FINAL USER OBJECT
    //////////////////////////////////////////////////////
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      activeBusinessId: user.activeBusinessId || null,
      employeeId: employee ? employee.id : null   // ⭐ IMPORTANT
    };
   // ⭐ ADD THIS
req.business = {
  id: user.activeBusinessId
};
    next();

  } catch (err) {
    console.error("Auth middleware error:", err);

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = authMiddleware;