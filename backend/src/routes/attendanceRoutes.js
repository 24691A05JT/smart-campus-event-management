const express = require('express');
const {
  getEventParticipants,
  markAttendance,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Organizer or Admin routes
router.get('/event/:eventId', protect, authorize('organizer', 'admin'), getEventParticipants);
router.get('/:eventId/registrations', protect, authorize('organizer', 'admin'), getEventParticipants);
router.get('/:eventId/participants', protect, authorize('organizer', 'admin'), getEventParticipants);

router.put('/:eventId/:studentId', protect, authorize('organizer', 'admin'), markAttendance);
router.put('/:eventId/student/:studentId', protect, authorize('organizer', 'admin'), markAttendance);

module.exports = router;
