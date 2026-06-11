const prisma = require("../config/prisma");
const SubscriptionService = require("../services/subscriptionService");
const { successResponse, errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// GET ANY BUSINESS SUBSCRIPTION (ADMIN ONLY)
//////////////////////////////////////////////////////
exports.getSubscription = async (req, res) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return errorResponse(res, "businessId is required", 400);
    }

    const subscription = await SubscriptionService.getSubscription(businessId);

    return successResponse(res, subscription, "Subscription fetched");
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message, 500);
  }
};

//////////////////////////////////////////////////////
// ACTIVATE SUBSCRIPTION
//////////////////////////////////////////////////////
exports.activateSubscription = async (req, res) => {
  try {
    const { businessId, durationMonths = 1, planName, notes } = req.body;

    if (!businessId)
      return errorResponse(res, "businessId required", 400);

    //////////////////////////////////////////////////////
    // 1️⃣ ACTIVATE SUBSCRIPTION
    //////////////////////////////////////////////////////
    const subscription = await prisma.subscription.update({
      where: { businessId },
      data: {
        status: "ACTIVE",
        startDate: new Date(),
        expiresAt: new Date(
          Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000
        ),
        planName,
        notes,
      },
    });

    //////////////////////////////////////////////////////
    // ⭐ 2️⃣ ACTIVATE BUSINESS (MISSING PART)
    //////////////////////////////////////////////////////
    await prisma.business.update({
      where: { id: businessId },
      data: { isActive: true },
    });

    return successResponse(res, subscription, "Subscription activated");

  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

//////////////////////////////////////////////////////
// EXTEND SUBSCRIPTION
//////////////////////////////////////////////////////
exports.extendSubscription = async (req, res) => {
  try {
    const { businessId, durationMonths = 1, planName, notes } = req.body;

    if (!businessId) {
      return errorResponse(res, "businessId required", 400);
    }

    const subscription = await SubscriptionService.extendSubscription(
      businessId,
      { durationMonths, planName, notes }
    );

    return successResponse(res, subscription, "Extended");
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message, 500);
  }
};

//////////////////////////////////////////////////////
// DEACTIVATE
//////////////////////////////////////////////////////
exports.deactivateSubscription = async (req, res) => {
  try {
    const { businessId } = req.body;

    if (!businessId) {
      return errorResponse(res, "businessId required", 400);
    }

    const subscription =
      await SubscriptionService.deactivateSubscription(businessId);

    return successResponse(res, subscription, "Deactivated");
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message, 500);
  }
};

//////////////////////////////////////////////////////
// ALL SUBSCRIPTIONS
//////////////////////////////////////////////////////
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const subscriptions = await SubscriptionService.getAllSubscriptions({
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return successResponse(res, subscriptions, "All subscriptions");
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message, 500);
  }
};

//////////////////////////////////////////////////////
// STATS
//////////////////////////////////////////////////////
exports.getSubscriptionStats = async (req, res) => {
  try {
    const stats = await SubscriptionService.getSubscriptionStats();
    return successResponse(res, stats, "Stats fetched");
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message, 500);
  }
};
