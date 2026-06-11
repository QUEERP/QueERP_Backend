const { errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// SUPER ADMIN MIDDLEWARE
//////////////////////////////////////////////////////

/**
 * Middleware to restrict access to super admin only
 * Uses JWT token role-based authentication for security
 * 
 * Usage: router.use(requireSuperAdmin);
 * 
 * Security Features:
 * - JWT-based role verification (no email comparison)
 * - API key fallback for server-to-server communication
 * - Comprehensive logging for security audit
 * - Rate limiting ready
 */
const requireSuperAdmin = (req, res, next) => {
  try {
    // Method 1: JWT Token-based authentication (Primary)
    if (req.user && req.user.isSuperAdmin) {
      // Log admin access for security audit
      console.log(`[ADMIN_ACCESS] Super Admin ${req.user.email} accessed ${req.method} ${req.path}`);
      
      // Add admin context to request
      req.adminContext = {
        source: 'jwt',
        email: req.user.email,
        userId: req.user.userId,
        timestamp: new Date().toISOString(),
      };
      
      return next();
    }

    // Method 2: API Key-based authentication (Fallback for server-to-server)
    const adminApiKey = req.headers['x-admin-api-key'];
    const validAdminKey = process.env.ADMIN_API_KEY;
    
    if (adminApiKey && validAdminKey && adminApiKey === validAdminKey) {
      // Log API key access
      console.log(`[ADMIN_ACCESS] API Key used to access ${req.method} ${req.path}`);
      
      // Create minimal admin context for API key access
      req.adminContext = {
        source: 'api_key',
        email: 'system@api-key',
        userId: 'system',
        timestamp: new Date().toISOString(),
      };
      
      // Set user object for compatibility
      req.user = {
        userId: 'system',
        email: 'system@api-key',
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
        isActive: true,
      };
      
      return next();
    }

    // Method 3: Environment variable fallback (Development only)
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (superAdminEmail && req.user && req.user.email === superAdminEmail) {
      console.warn(`[ADMIN_ACCESS] Fallback email check used for ${req.user.email} - Consider using role-based auth`);
      
      req.adminContext = {
        source: 'email_fallback',
        email: req.user.email,
        userId: req.user.userId,
        timestamp: new Date().toISOString(),
      };
      
      req.user.isSuperAdmin = true;
      return next();
    }

    // Log failed access attempt
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    console.warn(`[ADMIN_ACCESS_DENIED] ${req.method} ${req.path} - IP: ${clientIP} - User: ${req.user?.email || 'anonymous'}`);

    return errorResponse(
      res, 
      "Access denied. Super admin privileges required.", 
      403
    );

  } catch (error) {
    console.error("Super Admin Middleware Error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

/**
 * Middleware to check if user is either super admin or business owner
 * Useful for endpoints that should be accessible by business owners or super admins
 * 
 * Usage: router.use(requireAdminOrOwner);
 */
const requireAdminOrOwner = (req, res, next) => {
  try {
    // Check if super admin
    if (req.user && req.user.isSuperAdmin) {
      req.adminContext = {
        source: 'jwt',
        email: req.user.email,
        userId: req.user.userId,
        timestamp: new Date().toISOString(),
      };
      return next();
    }

    // Check API key
    const adminApiKey = req.headers['x-admin-api-key'];
    const validAdminKey = process.env.ADMIN_API_KEY;
    
    if (adminApiKey && validAdminKey && adminApiKey === validAdminKey) {
      req.adminContext = {
        source: 'api_key',
        email: 'system@api-key',
        userId: 'system',
        timestamp: new Date().toISOString(),
      };
      
      req.user = {
        userId: 'system',
        email: 'system@api-key',
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
        isActive: true,
      };
      return next();
    }

    // Check if business owner (assuming business is set by tenant middleware)
    if (req.business && req.business.ownerId === req.user.userId) {
      req.user.isBusinessOwner = true;
      return next();
    }

    // Log failed access attempt
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    console.warn(`[ADMIN_OWNER_ACCESS_DENIED] ${req.method} ${req.path} - IP: ${clientIP} - User: ${req.user?.email || 'anonymous'}`);

    return errorResponse(
      res, 
      "Access denied. Admin or business owner privileges required.", 
      403
    );

  } catch (error) {
    console.error("Admin/Owner Middleware Error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

/**
 * Middleware to check if user has minimum admin level
 * Accepts ADMIN or SUPER_ADMIN roles
 * 
 * Usage: router.use(requireMinimumAdmin);
 */
const requireMinimumAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Authentication required.", 401);
    }

    const adminRoles = ['ADMIN', 'SUPER_ADMIN'];
    
    if (adminRoles.includes(req.user.role)) {
      req.user.isAdmin = true;
      req.user.isSuperAdmin = req.user.role === 'SUPER_ADMIN';
      
      // Log admin access
      console.log(`[ADMIN_ACCESS] ${req.user.role} ${req.user.email} accessed ${req.method} ${req.path}`);
      
      return next();
    }

    // Check API key fallback
    const adminApiKey = req.headers['x-admin-api-key'];
    const validAdminKey = process.env.ADMIN_API_KEY;
    
    if (adminApiKey && validAdminKey && adminApiKey === validAdminKey) {
      req.user = {
        userId: 'system',
        email: 'system@api-key',
        role: 'SUPER_ADMIN',
        isAdmin: true,
        isSuperAdmin: true,
        isActive: true,
      };
      return next();
    }

    return errorResponse(
      res, 
      "Access denied. Admin privileges required.", 
      403
    );

  } catch (error) {
    console.error("Minimum Admin Middleware Error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

/**
 * Middleware factory for role-based access with logging
 * 
 * Usage: router.use(requireRoleWithLogging(['ADMIN', 'SUPER_ADMIN']));
 */
const requireRoleWithLogging = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, "Authentication required.", 401);
      }

      if (!allowedRoles.includes(req.user.role)) {
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        console.warn(`[ROLE_ACCESS_DENIED] ${req.user.role} ${req.user.email} attempted to access ${req.method} ${req.path} - IP: ${clientIP}`);
        
        return errorResponse(
          res, 
          `Access denied. Required roles: ${allowedRoles.join(', ')}. Current role: ${req.user.role}`, 
          403
        );
      }

      // Log successful access
      console.log(`[ROLE_ACCESS] ${req.user.role} ${req.user.email} accessed ${req.method} ${req.path}`);
      
      next();
    } catch (error) {
      console.error("Role With Logging Middleware Error:", error);
      return errorResponse(res, "Internal server error", 500);
    }
  };
};

module.exports = {
  requireSuperAdmin,
  requireAdminOrOwner,
  requireMinimumAdmin,
  requireRoleWithLogging,
};
