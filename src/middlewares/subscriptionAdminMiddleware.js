const { errorResponse } = require("../utils/response");

const requireSubscriptionAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Authentication required", 401);
    }

    //////////////////////////////////////////////////////
    // ONLY SUBSCRIPTION ADMIN CAN ACCESS
    //////////////////////////////////////////////////////
    if (req.user.role !== "SUPER_ADMIN") {
      return errorResponse(
        res,
        "Access denied. Subscription admin only.",
        403
      );
    }

    next();

  } catch (error) {
    console.error("Subscription admin middleware error:", error);
    return errorResponse(res, "Authorization failed", 500);
  }
};

module.exports = requireSubscriptionAdmin;
