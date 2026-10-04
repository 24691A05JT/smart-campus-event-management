const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

/**
 * @desc    Submit feedback and rating for an event
 * @route   POST /api/feedback/:eventId
 * @access  Private (Student)
 */
const submitFeedback = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.body.eventId;
    const { rating, comments } = req.body;

    // Validate event ID presence & format
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid event ID',
      });
    }

    // Validate rating
    const numericRating = Number(rating);
    if (!rating || isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating is required and must be a number between 1 and 5',
      });
    }

    // Role check: Only students can submit feedback
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Only students can submit event feedback',
      });
    }

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Verify student registration for this event
    const registration = await Registration.findOne({
      student: req.user._id,
      event: eventId,
      status: 'registered',
    });

    if (!registration) {
      return res.status(400).json({
        success: false,
        message: 'You must be registered for this event to submit feedback',
      });
    }

    // Check duplicate feedback
    const existingFeedback = await Feedback.findOne({
      student: req.user._id,
      event: eventId,
    });

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted feedback for this event',
      });
    }

    // Create feedback document
    let feedback;
    try {
      feedback = await Feedback.create({
        student: req.user._id,
        event: eventId,
        rating: numericRating,
        comments: comments ? String(comments).trim() : '',
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted feedback for this event',
        });
      }
      throw err;
    }

    if (typeof feedback.populate === 'function') {
      await feedback.populate('student', 'name department');
    }

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get feedback and rating stats for a specific event
 * @route   GET /api/feedback/event/:eventId
 * @access  Public / Authenticated
 */
const getEventFeedback = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format',
      });
    }

    const feedbacks = await Feedback.find({ event: eventId })
      .populate('student', 'name department')
      .sort({ createdAt: -1 });

    const count = feedbacks.length;
    const averageRating =
      count > 0
        ? parseFloat((feedbacks.reduce((acc, cur) => acc + cur.rating, 0) / count).toFixed(1))
        : 0;

    return res.status(200).json({
      success: true,
      averageRating,
      totalFeedbackCount: count,
      data: feedbacks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logged-in student's submitted feedbacks
 * @route   GET /api/feedback/my
 * @access  Private (Student)
 */
const getMyFeedback = async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find({ student: req.user._id })
      .populate('event', 'title category date venue bannerUrl')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
  getEventFeedback,
  getMyFeedback,
};
