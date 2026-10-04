const express = require('express');
const {
  submitFeedback,
  getEventFeedback,
  getMyFeedback,
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Student feedback routes
router.get('/my', protect, authorize('student'), getMyFeedback);
router.post('/register/:eventId', protect, authorize('student'), submitFeedback);
router.post('/:eventId', protect, authorize('student'), submitFeedback);
router.post('/', protect, authorize('student'), submitFeedback);

// Public / General view feedback routes
router.get('/event/:eventId', getEventFeedback);
router.get('/:eventId', getEventFeedback);

module.exports = router;
