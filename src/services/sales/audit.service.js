const prisma = require("../../config/prisma");

/**
 * Logs an administrative action safely, accepting an optional transaction client.
 */
const logAction = async (tx, { businessId, userId, userEmail, action, module = "SALES", entityType, entityId, details }) => {
  const client = tx || prisma;
  try {
    return await client.auditLog.create({
      data: {
        businessId,
        userId: userId || null,
        userEmail: userEmail || null,
        action,
        module,
        entityType,
        entityId: entityId ? String(entityId) : null,
        details: details || {}
      }
    });
  } catch (error) {
    console.error("Failed to log audit entry:", error);
    // Never fail main transaction due to logging failure
  }
};

/**
 * Dispatches system notifications inside or outside database transactions.
 */
const triggerNotification = async (tx, { businessId, userId, title, message, type = "INFO", entityType, entityId }) => {
  const client = tx || prisma;
  try {
    return await client.notification.create({
      data: {
        businessId,
        userId: userId || null,
        title,
        message,
        type,
        entityType,
        entityId: entityId ? String(entityId) : null
      }
    });
  } catch (error) {
    console.error("Failed to write notification:", error);
  }
};

module.exports = {
  logAction,
  triggerNotification
};
