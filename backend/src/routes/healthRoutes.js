const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint to verify backend server & DB connection status
 * @access  Public
 */
router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return res.status(200).json({
    success: true,
    message: 'Smart Campus API is healthy and operational!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatusMap[dbState] || 'unknown',
      connected: dbState === 1,
    },
    uptime: process.uptime(),
  });
});

module.exports = router;
