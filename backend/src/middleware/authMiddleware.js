import { verifyToken } from '../utils/token.js';

/**
 * Middleware: Verify JWT Bearer Token in Authorization header
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication token is missing.',
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // Attach user payload ({ id, phone, name, role, email })
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Invalid authentication token. Access forbidden.',
    });
  }
}

/**
 * Middleware Factory: Enforce Role-Based Access Control (RBAC)
 * Usage: requireRole('admin') or requireRole('admin', 'receptionist')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You do not have permission to access this resource. Required role: [${allowedRoles.join(' or ')}], Your role: [${req.user.role}]`,
      });
    }

    next();
  };
}

