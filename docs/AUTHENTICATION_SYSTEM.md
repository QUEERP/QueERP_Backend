# Production-Ready Authentication System

## 🎯 Overview

This document describes the comprehensive, production-ready authentication system implemented for the multi-tenant SaaS application. The system uses JWT tokens with role-based access control, providing secure authentication and authorization.

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client      │───▶│   Auth Routes   │───▶│   JWT Tokens    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Auth Middleware │───▶│ Role Middleware │───▶│ Protected APIs │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔐 Features

### ✅ Core Features
- **JWT-based authentication** with secure token generation
- **Role-based access control** (USER, ADMIN, SUPER_ADMIN)
- **Refresh token support** for extended sessions
- **API key authentication** for server-to-server communication
- **Comprehensive logging** for security audit
- **Production-ready error handling**

### 🔒 Security Features
- **Strong password hashing** (bcrypt with salt rounds: 12)
- **JWT token validation** with proper error handling
- **Security headers** (XSS protection, content type options)
- **Rate limiting ready** architecture
- **Access attempt logging** for monitoring

## 📊 Database Schema

### User Model
```sql
model User {
  id          String   @id @default(uuid())
  name        String
  email       String   @unique
  password    String
  role        UserRole @default(USER)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  businessesOwned Business[]     @relation("BusinessOwner")
  memberships     BusinessUser[]

  @@map("users")
}

enum UserRole {
  USER
  ADMIN
  SUPER_ADMIN
}
```

## 🎫 JWT Token Structure

### Access Token Payload
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "USER",
  "isActive": true,
  "isSuperAdmin": false,
  "iat": 1642694400,
  "exp": 1643299200,
  "iss": "QUE-Accounting",
  "aud": "QUE-Accounting-Users",
  "sub": "user-uuid"
}
```

### Refresh Token Payload
```json
{
  "userId": "uuid",
  "type": "refresh",
  "timestamp": 1642694400000,
  "iat": 1642694400,
  "exp": 1645286400
}
```

## 🛡️ Middleware Stack

### 1. Authentication Middleware (`authMiddleware`)
```javascript
// Verifies JWT token and attaches user to request
router.use(authMiddleware);

// Features:
// - Token extraction from Authorization header
// - JWT verification with proper error handling
// - User status validation
// - Security headers injection
```

### 2. Role-Based Middleware
```javascript
// Require specific roles
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));

// Require minimum role level
router.use(requireMinimumRole('ADMIN'));

// Optional authentication
router.use(optionalAuthMiddleware);
```

### 3. Super Admin Middleware
```javascript
// Super admin only
router.use(requireSuperAdmin);

// Admin or business owner
router.use(requireAdminOrOwner);

// Minimum admin level
router.use(requireMinimumAdmin);
```

## 🔑 Authentication Methods

### Method 1: JWT Token (Primary)
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Use token
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Method 2: API Key (Server-to-Server)
```bash
curl -X GET http://localhost:3001/api/admin/subscriptions/stats \
  -H "X-Admin-API-Key: YOUR_ADMIN_API_KEY"
```

### Method 3: Environment Fallback (Development)
```bash
# Set in .env
SUPER_ADMIN_EMAIL=admin@yourcompany.com

# User with this email gets super admin privileges
```

## 📡 API Endpoints

### Public Endpoints
```
POST /api/auth/register     - User registration
POST /api/auth/login        - User login
POST /api/auth/refresh      - Token refresh
```

### Protected Endpoints
```
POST /api/auth/logout       - User logout (requires auth)
GET  /api/auth/me          - Get current user (requires auth)
```

### Admin Endpoints
```
GET  /api/admin/subscriptions/stats    - Subscription stats (super admin)
GET  /api/admin/subscriptions          - List subscriptions (super admin)
POST /api/admin/subscriptions/activate   - Activate subscription (super admin)
```

## 🔧 Configuration

### Environment Variables
```bash
# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-min-64-characters"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key"
JWT_EXPIRES_IN="7d"
JWT_ISSUER="QUE-Accounting"
JWT_AUDIENCE="QUE-Accounting-Users"

# Super Admin Configuration
SUPER_ADMIN_EMAIL="admin@yourcompany.com"
ADMIN_API_KEY="your-secure-admin-api-key"

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/db"
```

## 🚀 Getting Started

### 1. Setup Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit with your values
nano .env
```

### 2. Database Migration
```bash
# Run Prisma migration
npx prisma db push

# Run user role migration
node scripts/migrate-to-roles.js

# Seed permissions
node prisma/seed.js
```

### 3. Start Server
```bash
npm start
# or
npm run dev
```

### 4. Test Authentication
```bash
# Run comprehensive tests
node test-auth.js
```

## 🧪 Testing

### Automated Testing
```bash
# Run all authentication tests
node test-auth.js

# Test specific scenarios
node -e "require('./test-auth').testUserLogin()"
```

### Manual Testing
```bash
# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "password": "password123"}'

# Login user
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Access protected endpoint
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔒 Security Best Practices

### ✅ Implemented
- **Strong password hashing** (bcrypt, 12 rounds)
- **JWT token validation** with proper error handling
- **Role-based access control** with hierarchy
- **API key authentication** for server-to-server
- **Security headers** injection
- **Access logging** for audit trails
- **Input validation** and sanitization
- **Error handling** without information leakage

### 🛡️ Recommendations
- **Enable HTTPS** in production
- **Use environment variables** for secrets
- **Implement rate limiting** (middleware ready)
- **Add token blacklisting** for logout
- **Monitor access logs** for suspicious activity
- **Regular security audits** of authentication flow
- **Use short token expiration** for sensitive operations

## 📝 Code Examples

### Creating Custom Role Middleware
```javascript
const { requireRole } = require('../middlewares/authMiddleware');

// Only allow admins and super admins
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));
```

### Checking User Role in Controller
```javascript
exports.myController = async (req, res) => {
  const { user } = req;
  
  if (user.isSuperAdmin) {
    // Super admin logic
  } else if (user.isAdmin) {
    // Admin logic
  } else {
    // Regular user logic
  }
};
```

### Using API Key Authentication
```javascript
// For server-to-server communication
const response = await axios.get('/api/admin/stats', {
  headers: {
    'X-Admin-API-Key': process.env.ADMIN_API_KEY
  }
});
```

## 🔄 Token Refresh Flow

```javascript
// 1. Login to get tokens
const loginResponse = await axios.post('/api/auth/login', credentials);
const { token, refreshToken } = loginResponse.data.data;

// 2. Use access token for API calls
const apiResponse = await axios.get('/api/protected', {
  headers: { Authorization: `Bearer ${token}` }
});

// 3. When token expires, refresh it
const refreshResponse = await axios.post('/api/auth/refresh', {
  refreshToken
});
const { token: newToken } = refreshResponse.data.data;
```

## 📊 Monitoring & Logging

### Access Logs
```
[ADMIN_ACCESS] Super Admin admin@company.com accessed GET /api/admin/subscriptions/stats
[ROLE_ACCESS_DENIED] USER user@example.com attempted to access POST /api/admin/users - IP: 192.168.1.100
[ADMIN_ACCESS_DENIED] GET /api/admin/dashboard - IP: 192.168.1.101 - User: anonymous
```

### Security Headers
```javascript
// Automatically added by auth middleware
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('X-XSS-Protection', '1; mode=block');
```

## 🚨 Troubleshooting

### Common Issues

#### 1. "Access denied. Super admin privileges required."
**Solution**: Check user role in database or set SUPER_ADMIN_EMAIL

#### 2. "Token has expired"
**Solution**: Implement token refresh or login again

#### 3. "Invalid token format or signature"
**Solution**: Ensure JWT_SECRET is consistent across servers

#### 4. "Authentication required"
**Solution**: Include Authorization header with Bearer token

### Debug Mode
```bash
# Enable debug logging
DEBUG=true npm start

# Check token payload
node -e "console.log(JSON.stringify(require('jsonwebtoken').decode('YOUR_TOKEN'), null, 2))"
```

## 📚 Additional Resources

- [JWT Best Practices](https://auth0.com/blog/json-web-token-best-practices)
- [Node.js Security Guidelines](https://nodejs.org/en/docs/guides/security)
- [Prisma Authentication Guide](https://www.prisma.io/docs/guides/auth)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

*This authentication system provides enterprise-grade security for your SaaS application while maintaining flexibility and scalability.*
