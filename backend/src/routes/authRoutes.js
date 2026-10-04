const express = require('express');
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Login user & get JWT token
 * @access  Public
 */
router.post('/login', loginUser);

/**
 * @route   GET /api/auth/me
 * @desc    Get logged in user details
 * @access  Private
 */
router.get('/me', protect, getMe);

module.exports = router;
