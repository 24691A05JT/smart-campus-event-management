const express = require('express');
const {
  createEvent,
  getApprovedEvents,
  getMyEvents,
  getAllEvents,
  getPendingEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  approveEvent,
  rejectEvent,
  updateEventStatus,
  checkConflictEndpoint,
} = require('../controllers/eventController');
const { getEventParticipants, markAttendance } = require('../controllers/attendanceController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes (Students / Guests)
router.get('/', getApprovedEvents);

// Specific listing routes (Must be defined BEFORE /:id to avoid URL param collision)
router.get('/my', protect, authorize('organizer'), getMyEvents);
router.get('/my-events', protect, authorize('organizer'), getMyEvents);

// Event registrations and attendance routes (Organizer/Admin)
router.get('/:eventId/registrations', protect, authorize('organizer', 'admin'), getEventParticipants);
router.get('/:eventId/participants', protect, authorize('organizer', 'admin'), getEventParticipants);
router.put('/:eventId/attendance/:studentId', protect, authorize('organizer', 'admin'), markAttendance);

// Admin-only listing routes
router.get('/all', protect, authorize('admin'), getAllEvents);
router.get('/pending', protect, authorize('admin'), getPendingEvents);

// Conflict check utility
router.post('/check-conflict', protect, authorize('organizer', 'admin'), checkConflictEndpoint);

// Admin approval routes
router.put('/:id/approve', protect, authorize('admin'), approveEvent);
router.put('/:id/reject', protect, authorize('admin'), rejectEvent);
router.patch('/:id/status', protect, authorize('admin'), updateEventStatus);

// Create new event (Organizer only)
router.post('/', protect, authorize('organizer'), createEvent);

// Single event CRUD operations
router.get('/:id', (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, () => getEventById(req, res, next));
  }
  return getEventById(req, res, next);
});

router.put('/:id', protect, authorize('organizer'), updateEvent);
router.delete('/:id', protect, authorize('organizer'), deleteEvent);

module.exports = router;
