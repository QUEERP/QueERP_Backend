//////////////////////////////////////////////////////
// BALANCED SUBSCRIPTION PROTECTION EXAMPLE
//////////////////////////////////////////////////////
// This shows how to allow basic access while protecting premium features

const express = require("express");
const {
  checkBusinessSubscription,
  checkBusinessSubscriptionReadOnly,
} = require("../middlewares/subscriptionMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");
const tenantMiddleware = require("../middlewares/tenantMiddleware");

const router = express.Router();

// Apply authentication and tenant setup to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

//////////////////////////////////////////////////////
// ALWAYS ALLOWED (No Subscription Required)
//////////////////////////////////////////////////////

// These endpoints work for any authenticated user
router.get("/profile", (req, res) => {
  res.json({ 
    user: req.user,
    business: req.business,
    subscription: req.subscription || null 
  });
});

router.get("/subscription-status", (req, res) => {
  // Show subscription status even if inactive
  res.json({ 
    hasSubscription: !!req.subscription,
    subscription: req.subscription,
    upgradeUrl: "https://yourcompany.com/pricing"
  });
});

//////////////////////////////////////////////////////
// READ ACCESS ALLOWED (Even with Expired Subscription)
//////////////////////////////////////////////////////

// Use read-only middleware for endpoints that should work even when expired
const readRouter = express.Router();
readRouter.use(checkBusinessSubscriptionReadOnly);

readRouter.get("/customers", (req, res) => {
  // Users can see their customers even with expired subscription
  res.json({ message: "Customers accessible for viewing" });
});

readRouter.get("/invoices", (req, res) => {
  // Users can see their invoices even with expired subscription
  res.json({ message: "Invoices accessible for viewing" });
});

readRouter.get("/reports/basic", (req, res) => {
  // Basic reports available to all
  res.json({ message: "Basic reports available" });
});

router.use("/read", readRouter);

//////////////////////////////////////////////////////
// WRITE ACCESS REQUIRES ACTIVE SUBSCRIPTION
//////////////////////////////////////////////////////

// Use full subscription check for endpoints that create/modify data
const writeRouter = express.Router();
writeRouter.use(checkBusinessSubscription);

writeRouter.post("/customers", (req, res) => {
  // Create customer - requires active subscription
  res.json({ message: "Customer created - active subscription required" });
});

writeRouter.post("/invoices", (req, res) => {
  // Create invoice - requires active subscription
  res.json({ message: "Invoice created - active subscription required" });
});

writeRouter.put("/customers/:id", (req, res) => {
  // Update customer - requires active subscription
  res.json({ message: "Customer updated - active subscription required" });
});

writeRouter.post("/reports/advanced", (req, res) => {
  // Advanced reports - requires active subscription
  res.json({ message: "Advanced reports - active subscription required" });
});

router.use("/write", writeRouter);

//////////////////////////////////////////////////////
// HYBRID APPROACH (Same Endpoint, Different Behavior)
//////////////////////////////////////////////////////

// Single endpoint that behaves differently based on subscription status
router.get("/dashboard", async (req, res) => {
  const isActive = await SubscriptionService.isSubscriptionActive(req.business.id);
  
  if (isActive) {
    // Full dashboard for active users
    res.json({
      type: "full",
      features: ["analytics", "reports", "export", "api_access"],
      data: await getFullDashboardData(req.business.id)
    });
  } else {
    // Limited dashboard for inactive users
    res.json({
      type: "limited",
      features: ["view_only"],
      message: "Upgrade to access all features",
      upgradeUrl: "https://yourcompany.com/pricing",
      data: await getLimitedDashboardData(req.business.id)
    });
  }
});

//////////////////////////////////////////////////////
// CUSTOM MIDDLEWARE FOR FEATURE-BASED ACCESS
//////////////////////////////////////////////////////

// Create custom middleware for feature-based access
const requireFeature = (feature) => {
  return async (req, res, next) => {
    const subscription = await SubscriptionService.getSubscription(req.business.id);
    
    if (!subscription.isActive) {
      return errorResponse(res, "Active subscription required for this feature", 403);
    }
    
    // Check plan-specific features
    const planFeatures = {
      'BASIC': ['customers', 'invoices'],
      'PREMIUM': ['customers', 'invoices', 'reports', 'api'],
      'ENTERPRISE': ['customers', 'invoices', 'reports', 'api', 'advanced_analytics', 'integrations']
    };
    
    const allowedFeatures = planFeatures[subscription.planName] || [];
    
    if (!allowedFeatures.includes(feature)) {
      return errorResponse(res, `Feature '${feature}' not available in your plan`, 403);
    }
    
    req.feature = feature;
    next();
  };
};

// Apply feature-based protection
router.post("/advanced-analytics", requireFeature('advanced_analytics'), (req, res) => {
  res.json({ message: "Advanced analytics - enterprise plan required" });
});

router.post("/integrations", requireFeature('integrations'), (req, res) => {
  res.json({ message: "Third-party integrations - enterprise plan required" });
});

//////////////////////////////////////////////////////
// GRACEFUL DEGRADATION
//////////////////////////////////////////////////////

// Endpoints that gracefully degrade functionality
router.get("/exports/:type", async (req, res) => {
  const subscription = await SubscriptionService.getSubscription(req.business.id);
  
  if (subscription.isActive) {
    // Full export functionality
    const data = await getFullExportData(req.business.id, req.params.type);
    res.json({ 
      type: "full",
      data,
      format: "xlsx"
    });
  } else {
    // Limited export (CSV only, limited records)
    const data = await getLimitedExportData(req.business.id, req.params.type);
    res.json({ 
      type: "limited",
      data,
      format: "csv",
      message: "Upgrade for full export capabilities"
    });
  }
});

module.exports = router;
