//////////////////////////////////////////////////////
// EXAMPLE: PROTECTED ROUTES WITH SUBSCRIPTION MIDDLEWARE
//////////////////////////////////////////////////////

// This file demonstrates how to apply subscription middleware
// to protect your API endpoints based on subscription status

const express = require("express");
const {
  checkBusinessSubscription,
  checkBusinessSubscriptionReadOnly,
  checkBusinessSubscriptionWithHeaders,
} = require("../middlewares/subscriptionMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");
const tenantMiddleware = require("../middlewares/tenantMiddleware");

const router = express.Router();

//////////////////////////////////////////////////////
// MIDDLEWARE ORDER IS IMPORTANT
//////////////////////////////////////////////////////

// 1. First, authenticate the user
router.use(authMiddleware);

// 2. Then, set up tenant context (business info)
router.use(tenantMiddleware);

// 3. Finally, check subscription (this blocks inactive/expired subscriptions)
router.use(checkBusinessSubscription);

//////////////////////////////////////////////////////
// PROTECTED ENDPOINTS
//////////////////////////////////////////////////////

// These endpoints will only work if subscription is ACTIVE and not expired
router.post("/customers", (req, res) => {
  // Create customer - requires active subscription
  res.json({ message: "Customer created successfully" });
});

router.post("/invoices", (req, res) => {
  // Create invoice - requires active subscription
  res.json({ message: "Invoice created successfully" });
});

router.put("/customers/:id", (req, res) => {
  // Update customer - requires active subscription
  res.json({ message: "Customer updated successfully" });
});

//////////////////////////////////////////////////////
// READ-ONLY ENDPOINTS (ALTERNATIVE MIDDLEWARE)
//////////////////////////////////////////////////////

// For routes that should allow read access even with expired subscription
const readRouter = express.Router();

readRouter.use(authMiddleware);
readRouter.use(tenantMiddleware);
readRouter.use(checkBusinessSubscriptionReadOnly); // Allows GET requests even with inactive subscription

readRouter.get("/customers", (req, res) => {
  // Get customers - works even with expired subscription
  res.json({ message: "Customers retrieved successfully" });
});

readRouter.get("/invoices", (req, res) => {
  // Get invoices - works even with expired subscription
  res.json({ message: "Invoices retrieved successfully" });
});

//////////////////////////////////////////////////////
// ENDPOINTS WITH SUBSCRIPTION HEADERS
//////////////////////////////////////////////////////

// For endpoints that should include subscription info in response headers
const headerRouter = express.Router();

headerRouter.use(authMiddleware);
headerRouter.use(tenantMiddleware);
headerRouter.use(checkBusinessSubscriptionWithHeaders); // Adds X-Subscription-* headers

headerRouter.get("/subscription-info", (req, res) => {
  // This endpoint will have subscription info in headers
  res.json({ 
    message: "Subscription info available in response headers",
    subscription: req.subscription // Also available in req.subscription
  });
});

//////////////////////////////////////////////////////
// SELECTIVE PROTECTION
//////////////////////////////////////////////////////

// You can also apply middleware to specific routes only
const selectiveRouter = express.Router();

selectiveRouter.use(authMiddleware);
selectiveRouter.use(tenantMiddleware);

// Protect only write operations
selectiveRouter.post("/data", checkBusinessSubscription, (req, res) => {
  res.json({ message: "Data created - active subscription required" });
});

// Allow read operations without subscription check
selectiveRouter.get("/data", (req, res) => {
  res.json({ message: "Data retrieved - no subscription required" });
});

//////////////////////////////////////////////////////
// ERROR RESPONSES
//////////////////////////////////////////////////////

// When subscription is inactive or expired, middleware returns:
// HTTP 403 Forbidden
// {
//   "success": false,
//   "message": "Your subscription has expired. Please contact support."
// }

// With checkBusinessSubscriptionWithHeaders, additional headers are included:
// X-Subscription-Status: ACTIVE|EXPIRED|INACTIVE
// X-Subscription-Expires-At: 2024-02-01T00:00:00.000Z
// X-Subscription-Remaining-Days: 15
// X-Subscription-Active: true|false

module.exports = {
  router,
  readRouter,
  headerRouter,
  selectiveRouter,
};
