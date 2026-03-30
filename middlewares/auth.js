const jwt = require('jsonwebtoken');
const config = require('../configs');
const response = require('./response');
const userModel = require('../schemas/users');
const auditLogModel = require('../schemas/auditLogs');

/**
 * Middleware: Verify Access Token
 * Supports Bearer token in Authorization header
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.unauthorized(res, "Access token is required");
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, config.ACCESS_TOKEN_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return response.unauthorized(res, "Access token expired - please refresh token");
      }
      return response.unauthorized(res, "Invalid access token");
    }

    const user = await userModel.findOne({
      _id: decoded.id,
      isDeleted: false
    }).populate({
      path: 'role',
      populate: { path: 'permissions' }
    });

    if (!user) {
      return response.unauthorized(res, "User not found or deleted");
    }

    if (!user.status) {
      return response.forbidden(res, "Your account has been locked");
    }

    req.user = user;
    next();
  } catch (error) {
    return response.serverError(res, "Authentication error", error);
  }
};

/**
 * Middleware: Check Role(s)
 * Usage: authorize("ADMIN")  or  authorize("ADMIN", "STAFF")
 */
const authorize = (...requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return response.unauthorized(res);
    }

    const userRoleName = req.user.role?.name;

    if (!requiredRoles.includes(userRoleName)) {
      return response.forbidden(
        res,
        `This action requires one of these roles: ${requiredRoles.join(', ')}`
      );
    }

    next();
  };
};

/**
 * Middleware: Check Permission
 * Usage: checkPermission("product", "delete")
 */
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return response.unauthorized(res);
    }

    const role = req.user.role;
    if (!role || !role.permissions) {
      return response.forbidden(res, "No permissions assigned to your role");
    }

    // ADMIN bypasses permission check
    if (role.name === "ADMIN") {
      return next();
    }

    const hasPermission = role.permissions.some(
      (p) => p.resource === resource && (p.action === action || p.action === "manage")
    );

    if (!hasPermission) {
      return response.forbidden(
        res,
        `You don't have '${action}' permission on '${resource}'`
      );
    }

    next();
  };
};

/**
 * Helper: Log audit action (call from route handlers)
 */
const logAction = async (req, action, resource, resourceId = null, detail = null, status = "success") => {
  try {
    await auditLogModel.create({
      user: req.user ? req.user._id : null,
      action,
      resource,
      resourceId,
      detail,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || "",
      status
    });
  } catch (err) {
    // Don't block the main flow if logging fails
    console.error("AuditLog error:", err.message);
  }
};

module.exports = { authenticate, authorize, checkPermission, logAction };
