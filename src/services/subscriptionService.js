const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// SUBSCRIPTION SERVICE LAYER
//////////////////////////////////////////////////////

class SubscriptionService {
  /**
   * Get subscription details for a business
   * @param {string} businessId - Business ID
   * @returns {Promise<Object>} Subscription details
   */
  static async getSubscription(businessId) {
    const subscription = await prisma.subscription.findUnique({
      where: { businessId },
    });

    if (!subscription) {
      throw new Error("Subscription not found for this business");
    }

    // Calculate remaining days
    const now = new Date();
    const expiresAt = new Date(subscription.expiresAt);
    const remainingDays = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    return {
      ...subscription,
      remainingDays: Math.max(0, remainingDays),
      isActive: subscription.status === "ACTIVE" && expiresAt > now,
    };
  }

  /**
   * Activate subscription for a business
   * @param {string} businessId - Business ID
   * @param {Object} options - Activation options
   * @returns {Promise<Object>} Updated subscription
   */
  static async activateSubscription(businessId, options = {}) {
    const { durationMonths = 1, planName, notes } = options;
    
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    const subscription = await prisma.subscription.upsert({
      where: { businessId },
      update: {
        status: "ACTIVE",
        startDate: now,
        expiresAt,
        planName: planName || null,
        notes: notes || null,
      },
      create: {
        businessId,
        status: "ACTIVE",
        startDate: now,
        expiresAt,
        planName: planName || null,
        notes: notes || null,
      },
    });

    return subscription;
  }

  /**
   * Extend subscription for a business
   * @param {string} businessId - Business ID
   * @param {Object} options - Extension options
   * @returns {Promise<Object>} Updated subscription
   */
  static async extendSubscription(businessId, options = {}) {
    const { durationMonths = 1, planName, notes } = options;
    
    const currentSubscription = await prisma.subscription.findUnique({
      where: { businessId },
    });

    if (!currentSubscription) {
      throw new Error("Subscription not found for this business");
    }

    const now = new Date();
    let baseDate;

    // If subscription is active, extend from current expiry
    // If expired, extend from current date
    if (currentSubscription.status === "ACTIVE" && new Date(currentSubscription.expiresAt) > now) {
      baseDate = new Date(currentSubscription.expiresAt);
    } else {
      baseDate = now;
    }

    const newExpiresAt = new Date(baseDate);
    newExpiresAt.setMonth(newExpiresAt.getMonth() + durationMonths);

    const updatedSubscription = await prisma.subscription.update({
      where: { businessId },
      data: {
        status: "ACTIVE",
        startDate: currentSubscription.startDate || now,
        expiresAt: newExpiresAt,
        planName: planName || currentSubscription.planName,
        notes: notes || currentSubscription.notes,
      },
    });

    return updatedSubscription;
  }

  /**
   * Deactivate subscription for a business
   * @param {string} businessId - Business ID
   * @returns {Promise<Object>} Updated subscription
   */
  static async deactivateSubscription(businessId) {
    const subscription = await prisma.subscription.update({
      where: { businessId },
      data: {
        status: "INACTIVE",
      },
    });

    return subscription;
  }

  /**
   * Check if business has active subscription
   * @param {string} businessId - Business ID
   * @returns {Promise<boolean>} True if subscription is active
   */
  static async isSubscriptionActive(businessId) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { businessId },
      });

      if (!subscription) {
        return false;
      }

      const now = new Date();
      const expiresAt = new Date(subscription.expiresAt);
      
      return subscription.status === "ACTIVE" && expiresAt > now;
    } catch (error) {
      console.error("Error checking subscription:", error);
      return false;
    }
  }

  /**
   * Get all subscriptions (admin only)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of subscriptions
   */
  static async getAllSubscriptions(filters = {}) {
    const { status, page = 1, limit = 50 } = filters;
    
    const where = status ? { status } : {};
    
    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Add computed fields
    const now = new Date();
    return subscriptions.map(sub => ({
      ...sub,
      remainingDays: Math.max(0, Math.ceil((new Date(sub.expiresAt) - now) / (1000 * 60 * 60 * 24))),
      isActive: sub.status === "ACTIVE" && new Date(sub.expiresAt) > now,
    }));
  }
}

module.exports = SubscriptionService;
