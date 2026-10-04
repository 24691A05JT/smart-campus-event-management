const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT token
 * @param {string} id - User MongoDB ObjectId
 * @param {string} role - User role (student, organizer, admin)
 * @returns {string} - Signed JWT token
 */
const generateToken = (id, role) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  return jwt.sign({ id, role }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

module.exports = generateToken;
