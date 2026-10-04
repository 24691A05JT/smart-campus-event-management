const express = require('express');
const {
  getOrganizerAnalyticsController,
  getAdminAnalyticsController,
  getAnalytics,
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/organizer', protect, authorize('organizer', 'admin'), getOrganizerAnalyticsController);
router.get('/admin', protect, authorize('admin'), getAdminAnalyticsController);
router.get('/', protect, authorize('organizer', 'admin'), getAnalytics);

module.exports = router;
