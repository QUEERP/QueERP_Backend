const { errorResponse } = require("../utils/response");

const subscriptionMiddleware = (req, res, next) => {
  try {
    const business = req.business;   // ✅ correct property

    if (!business || !business.subscription) {
      return errorResponse(res, "No subscription found for this business", 403);
    }

    const { status, expiresAt } = business.subscription;

    if (status !== "ACTIVE") {
      return errorResponse(res, `Subscription is ${status.toLowerCase()}`, 403);
    }

    if (expiresAt && new Date(expiresAt) < new Date()) {
      return errorResponse(res, "Subscription has expired", 403);
    }

    next();

  } catch (error) {
    console.error("Subscription Middleware Error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = subscriptionMiddleware;
