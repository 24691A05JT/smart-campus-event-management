const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

/**
 * @desc    Register logged-in student for an approved event
 * @route   POST /api/registrations or POST /api/registrations/:eventId
 * @access  Private (Student)
 */
const registerForEvent = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.body.eventId;

    // Validate event ID presence & format
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid event ID',
      });
    }

    // Find target event
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Enforce status requirement: Event must be approved
    if (event.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot register for an event that has not been approved',
      });
    }

    // Enforce registration seat limit
    const capacity = event.maxSeats !== undefined ? Number(event.maxSeats) : Number(event.registrationLimit || 0);
    const currentRegistered = Number(event.registeredCount || 0);
    if (capacity > 0 && currentRegistered >= capacity) {
      return res.status(400).json({
        success: false,
        message: 'Registration full. This event has reached its maximum capacity limit.',
      });
    }

    // Check duplicate registration
    const existingRegistration = await Registration.findOne({
      student: req.user._id,
      event: eventId,
      status: 'registered',
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event',
      });
    }

    // Create registration document
    let registration;
    try {
      registration = await Registration.create({
        student: req.user._id,
        event: eventId,
        registrationDate: new Date(),
        status: 'registered',
        attendanceStatus: 'unmarked',
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'You are already registered for this event',
        });
      }
      throw createErr;
    }

    // Increment registeredCount on Event
    event.registeredCount = (event.registeredCount || 0) + 1;
    await event.save();

    // Populate registration event info if populate function exists
    if (registration && typeof registration.populate === 'function') {
      await registration.populate({
        path: 'event',
        select: 'title category date startTime endTime venue bannerUrl maxSeats registeredCount status',
        populate: { path: 'organizer', select: 'name email department' },
      });
    }

    // Trigger automatic in-app notification
    try {
      const { createNotification } = require('../services/notificationService');
      await createNotification({
        userId: req.user._id,
        title: 'Registration Successful 🎉',
        message: `You have successfully registered for "${event.title}".`,
        type: 'registration',
        link: '/my-registrations',
        recipientEmail: req.user.email,
      });
    } catch (notifErr) {
      console.warn('Registration notification warning:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Event registration completed successfully',
      data: registration,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logged-in student's registrations
 * @route   GET /api/registrations/my
 * @access  Private (Student)
 */
const getMyRegistrations = async (req, res, next) => {
  try {
    const registrations = await Registration.find({
      student: req.user._id,
      status: 'registered',
    })
      .populate({
        path: 'event',
        select: 'title description category date startTime endTime venue bannerUrl maxSeats registeredCount status',
        populate: { path: 'organizer', select: 'name email department' },
      })
      .sort({ createdAt: -1 });

    const validRegistrations = Array.isArray(registrations)
      ? registrations.filter((r) => r && r.event !== null)
      : [];

    return res.status(200).json({
      success: true,
      count: validRegistrations.length,
      data: validRegistrations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check registration status for a specific event
 * @route   GET /api/registrations/check/:eventId
 * @access  Private (Student)
 */
const checkRegistrationStatus = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format',
      });
    }

    const registration = await Registration.findOne({
      student: req.user._id,
      event: eventId,
      status: 'registered',
    });

    return res.status(200).json({
      success: true,
      isRegistered: !!registration,
      data: registration || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel student registration for an event
 * @route   DELETE /api/registrations/:eventId
 * @access  Private (Student)
 */
const cancelRegistration = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format',
      });
    }

    const registration = await Registration.findOne({
      student: req.user._id,
      event: eventId,
      status: 'registered',
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Active registration record not found',
      });
    }

    registration.status = 'cancelled';
    await registration.save();

    const event = await Event.findById(eventId);
    if (event && event.registeredCount > 0) {
      event.registeredCount -= 1;
      await event.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerForEvent,
  getMyRegistrations,
  checkRegistrationStatus,
  cancelRegistration,
};
