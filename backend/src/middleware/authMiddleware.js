const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes - Verifies JWT Token from Authorization header
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({
          success: false,
          message: 'Server configuration error: JWT_SECRET missing',
        });
      }

      // Verify token
      const decoded = jwt.verify(token, secret);

      // Get user from token (exclude password)
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user associated with token no longer exists',
        });
      }

      req.user = user;
      return next();
    } catch (error) {
      console.error('JWT Authentication Error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token validation failed',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no bearer token provided',
    });
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * @param  {...string} roles - Allowed roles (student, organizer, admin)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, missing user authentication',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this resource`,
      });
    }

    next();
  };
};

module.exports = {
  protect,
  authorize,
};
