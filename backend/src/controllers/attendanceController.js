const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

/**
 * @desc    Get all registered participants & attendance status for an event
 * @route   GET /api/attendance/event/:eventId or GET /api/events/:eventId/registrations
 * @access  Private (Organizer of event or Admin)
 */
const getEventParticipants = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.params.id;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid event ID',
      });
    }

    // Role check: Students cannot access participant management
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Student role cannot access participant management data',
      });
    }

    const event = await Event.findById(eventId).populate('organizer', 'name email department');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    if (req.user.role === 'organizer' && event.organizer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only view participants for events you organized',
      });
    }

    // Fetch active registrations
    const registrations = await Registration.find({
      event: eventId,
      status: 'registered',
    })
      .populate('student', 'name email department interests')
      .populate('attendanceMarkedBy', 'name email')
      .sort({ createdAt: -1 });

    const totalRegistered = registrations.length;
    const presentCount = registrations.filter((r) => r.attendanceStatus === 'present').length;
    const absentCount = registrations.filter((r) => r.attendanceStatus === 'absent').length;
    const unmarkedCount = registrations.filter(
      (r) => !r.attendanceStatus || r.attendanceStatus === 'unmarked'
    ).length;

    return res.status(200).json({
      success: true,
      event: {
        _id: event._id,
        title: event.title,
        category: event.category,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        venue: event.venue,
        maxSeats: event.maxSeats,
        registeredCount: event.registeredCount,
        organizer: event.organizer,
      },
      stats: {
        totalRegistered,
        presentCount,
        absentCount,
        unmarkedCount,
        attendanceRate: totalRegistered > 0 ? Math.round((presentCount / totalRegistered) * 100) : 0,
      },
      count: totalRegistered,
      data: registrations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark student attendance for an event
 * @route   PUT /api/attendance/:eventId/:studentId or PUT /api/registrations/:eventId/attendance/:studentId
 * @access  Private (Organizer of event or Admin)
 */
const markAttendance = async (req, res, next) => {
  try {
    const { eventId, studentId } = req.params;
    const status = req.body.status || req.body.attendanceStatus || 'present';

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format',
      });
    }

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format',
      });
    }

    if (!['present', 'absent', 'unmarked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance status. Must be present, absent, or unmarked',
      });
    }

    // Role check: Students cannot mark attendance
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Students cannot mark attendance',
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    if (req.user.role === 'organizer' && event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only mark attendance for your own events',
      });
    }

    // Find active registration record
    const registration = await Registration.findOne({
      event: eventId,
      student: studentId,
      status: 'registered',
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Student is not registered for this event',
      });
    }

    registration.attendanceStatus = status;
    registration.attendanceMarkedAt = new Date();
    registration.attendanceMarkedBy = req.user._id;

    await registration.save();

    if (typeof registration.populate === 'function') {
      await registration.populate('student', 'name email department');
      await registration.populate('attendanceMarkedBy', 'name email');
    }

    return res.status(200).json({
      success: true,
      message: `Attendance marked as '${status}' successfully`,
      data: registration,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEventParticipants,
  markAttendance,
};
