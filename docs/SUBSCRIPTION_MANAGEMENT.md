# Subscription Management System Documentation

## Overview

This document describes the manual subscription management system implemented for the multi-tenant SaaS accounting application. The system provides complete subscription lifecycle management without payment gateway integration.

## Features

- ✅ Manual subscription activation/extension/deactivation
- ✅ Automatic subscription validation middleware
- ✅ Admin-only management endpoints
- ✅ Subscription statistics and reporting
- ✅ Flexible middleware for different protection levels
- ✅ Production-ready security measures

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Controllers   │───▶│    Services     │───▶│   Prisma ORM   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Routes       │    │   Middleware    │    │   Database     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## API Endpoints

### Admin Subscription Management

All admin endpoints require super admin privileges and are protected by `requireSuperAdmin` middleware.

#### 1. Get Subscription Statistics
```
GET /api/admin/subscriptions/stats
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBusinesses": 150,
    "activeSubscriptions": 120,
    "expiredSubscriptions": 25,
    "inactiveSubscriptions": 5,
    "statusBreakdown": {
      "ACTIVE": 120,
      "EXPIRED": 25,
      "INACTIVE": 5
    }
  }
}
```

#### 2. Get All Subscriptions
```
GET /api/admin/subscriptions?status=ACTIVE&page=1&limit=50
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `status`: Filter by status (ACTIVE, EXPIRED, INACTIVE) - optional
- `page`: Page number - default: 1
- `limit`: Items per page - default: 50

#### 3. Get Business Subscription
```
GET /api/admin/subscriptions/:businessId
Authorization: Bearer <admin_token>
```

#### 4. Activate Subscription
```
POST /api/admin/subscriptions/:businessId/activate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "durationMonths": 12,
  "planName": "Premium",
  "notes": "Annual payment received via PayPal"
}
```

#### 5. Extend Subscription
```
POST /api/admin/subscriptions/:businessId/extend
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "durationMonths": 6,
  "planName": "Premium",
  "notes": "Extension payment received"
}
```

#### 6. Deactivate Subscription
```
POST /api/admin/subscriptions/:businessId/deactivate
Authorization: Bearer <admin_token>
```

## Middleware Usage

### 1. Basic Subscription Protection
```javascript
const { checkBusinessSubscription } = require('../middlewares/subscriptionMiddleware');

router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(checkBusinessSubscription); // Blocks inactive/expired subscriptions
```

### 2. Read-Only Access
```javascript
const { checkBusinessSubscriptionReadOnly } = require('../middlewares/subscriptionMiddleware');

router.use(checkBusinessSubscriptionReadOnly); // Allows GET requests even with expired subscription
```

### 3. With Subscription Headers
```javascript
const { checkBusinessSubscriptionWithHeaders } = require('../middlewares/subscriptionMiddleware');

router.use(checkBusinessSubscriptionWithHeaders); // Adds X-Subscription-* headers
```

## Security

### Super Admin Authentication

The system supports multiple super admin authentication methods:

1. **Email-based**: Set `SUPER_ADMIN_EMAIL` environment variable
2. **Role-based**: Check for `SUPER_ADMIN` or `ADMIN` role in JWT
3. **API Key-based**: Use `X-Admin-API-Key` header with `ADMIN_API_KEY` environment variable

### Environment Variables

```bash
# Super Admin Configuration
SUPER_ADMIN_EMAIL=admin@yourcompany.com
ADMIN_API_KEY=your-secret-admin-key

# Database Configuration
DATABASE_URL=postgresql://...

# JWT Configuration (existing)
JWT_SECRET=your-jwt-secret
```

## Database Schema

### Subscription Table

```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  business_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRED', 'INACTIVE')),
  start_date TIMESTAMP,
  expires_at TIMESTAMP,
  plan_name TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);
```

## Business Logic

### Subscription Status Rules

1. **ACTIVE**: Subscription is valid and not expired
2. **EXPIRED**: Subscription was active but expiry date passed
3. **INACTIVE**: Subscription manually deactivated

### Automatic Expiry Handling

The system automatically treats subscriptions as expired when:
- `status === 'ACTIVE'` AND `expiresAt < NOW()`

### Extension Logic

- If subscription is active → extend from current `expiresAt`
- If subscription is expired → extend from current date
- Prevents negative duration and overlapping extensions

## Implementation Examples

### Protecting Existing Routes

```javascript
// customerRoutes.js
const { checkBusinessSubscription } = require('../middlewares/subscriptionMiddleware');

router.post("/", checkBusinessSubscription, controller.createCustomer);
router.put("/:id", checkBusinessSubscription, controller.updateCustomer);
router.delete("/:id", checkBusinessSubscription, controller.deleteCustomer);

// Allow read access even with expired subscription
router.get("/", checkBusinessSubscriptionReadOnly, controller.getCustomers);
```

### Custom Subscription Logic

```javascript
// Custom middleware for specific business logic
const customSubscriptionCheck = async (req, res, next) => {
  const subscription = req.subscription;
  
  // Allow trial users to read data
  if (subscription.planName === 'TRIAL' && req.method === 'GET') {
    return next();
  }
  
  // Premium users get full access
  if (subscription.planName === 'PREMIUM') {
    return next();
  }
  
  // Basic users have limited access
  if (subscription.planName === 'BASIC' && req.path.includes('/limited-endpoint')) {
    return next();
  }
  
  return errorResponse(res, "Upgrade your plan to access this feature", 403);
};
```

## Error Handling

### Subscription Middleware Errors

```json
{
  "success": false,
  "message": "Your subscription has expired. Please contact support."
}
```

### Admin Access Errors

```json
{
  "success": false,
  "message": "Access denied. Super admin privileges required."
}
```

## Testing

### 1. Test Subscription Middleware
```bash
# Test with active subscription
curl -X POST http://localhost:3001/api/customers \
  -H "Authorization: Bearer <token>" \
  -H "x-business-id: <business_id>" \
  -d '{"name": "Test Customer"}'

# Test with expired subscription (should return 403)
curl -X POST http://localhost:3001/api/customers \
  -H "Authorization: Bearer <expired_token>" \
  -H "x-business-id: <expired_business_id>" \
  -d '{"name": "Test Customer"}'
```

### 2. Test Admin Endpoints
```bash
# Activate subscription
curl -X POST http://localhost:3001/api/admin/subscriptions/<business_id>/activate \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"durationMonths": 12, "planName": "Premium"}'

# Get subscription stats
curl -X GET http://localhost:3001/api/admin/subscriptions/stats \
  -H "Authorization: Bearer <admin_token>"
```

## Future Enhancements

### Payment Gateway Integration

The system is designed to easily integrate payment gateways:

```javascript
// Future: Payment gateway integration
class PaymentService {
  static async processPayment(businessId, planId, paymentMethod) {
    // Stripe, Razorpay, PayPal integration
    const payment = await stripe.charges.create({...});
    
    if (payment.status === 'succeeded') {
      await SubscriptionService.activateSubscription(businessId, {
        durationMonths: plan.durationMonths,
        planName: plan.name,
        notes: `Payment processed via ${paymentMethod}`
      });
    }
  }
}
```

### Automated Billing

```javascript
// Future: Automated subscription renewal
class BillingService {
  static async processRenewals() {
    const expiringSoon = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      }
    });
    
    // Process automatic renewals
  }
}
```

## Production Deployment

### 1. Environment Setup
```bash
# Set required environment variables
export SUPER_ADMIN_EMAIL="admin@yourcompany.com"
export ADMIN_API_KEY="your-secure-api-key"
export DATABASE_URL="postgresql://..."
```

### 2. Database Migration
```bash
npx prisma db push
node prisma/seed.js
```

### 3. Start Application
```bash
npm start
```

## Monitoring and Logging

### Subscription Events
The system logs important subscription events:
- Subscription activation
- Subscription extension
- Subscription deactivation
- Subscription expiry checks
- Admin access attempts

### Metrics to Monitor
- Active vs expired subscription ratio
- Subscription renewal rates
- Admin operation frequency
- Middleware blocking events

## Support

For issues or questions about the subscription management system:

1. Check application logs for detailed error messages
2. Verify environment variables are properly set
3. Ensure database schema is up to date
4. Test with valid super admin credentials

---

*This subscription management system provides a solid foundation for SaaS billing operations while maintaining flexibility for future payment gateway integrations.*
