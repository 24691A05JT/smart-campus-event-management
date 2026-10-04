const express = require('express');
const {
  registerForEvent,
  getMyRegistrations,
  checkRegistrationStatus,
  cancelRegistration,
} = require('../controllers/registrationController');
const {
  getEventParticipants,
  markAttendance,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Student only routes
router.get('/my', protect, authorize('student'), getMyRegistrations);
router.get('/check/:eventId', protect, authorize('student'), checkRegistrationStatus);
router.post('/register', protect, authorize('student'), registerForEvent);
router.post('/:eventId', protect, authorize('student'), registerForEvent);
router.post('/', protect, authorize('student'), registerForEvent);
router.delete('/:eventId', protect, authorize('student'), cancelRegistration);

// Organizer / Admin attendance & registrant management routes
router.get('/event/:eventId', protect, authorize('organizer', 'admin'), getEventParticipants);
router.put('/:eventId/attendance/:studentId', protect, authorize('organizer', 'admin'), markAttendance);

module.exports = router;
