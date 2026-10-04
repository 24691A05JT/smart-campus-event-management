const mongoose = require('mongoose');
const Event = require('../models/Event');
const { checkEventConflict } = require('../services/conflictService');
const { isTimeBefore } = require('../utils/timeUtils');

/**
 * @desc    Create a new event
 * @route   POST /api/events
 * @access  Private (Organizer)
 */
const createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      venue,
      date,
      startTime,
      endTime,
      targetDepartments,
      eligibility,
      maxSeats,
      registrationLimit,
      bannerUrl,
      image,
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !String(title).trim() ||
      !description ||
      !String(description).trim() ||
      !category ||
      !venue ||
      !String(venue).trim() ||
      !date ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title, description, category, venue, date, startTime, endTime',
      });
    }

    // Validate registrationLimit / maxSeats
    const rawSeats = registrationLimit !== undefined ? registrationLimit : maxSeats;
    const seats = Number(rawSeats);
    if (rawSeats === undefined || rawSeats === null || isNaN(seats) || seats <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please specify a valid registration limit / maximum seats (must be a positive number)',
      });
    }

    // Validate category enum
    const validCategories = ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      });
    }

    // Validate date format
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event date provided',
      });
    }

    // Validate time range (startTime < endTime)
    try {
      if (!isTimeBefore(startTime, endTime)) {
        return res.status(400).json({
          success: false,
          message: 'Event end time must be strictly after start time',
        });
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid time range specified',
      });
    }

    // Check scheduling conflict
    const conflictResult = await checkEventConflict({
      venue: venue.trim(),
      date: parsedDate,
      startTime,
      endTime,
    });

    if (conflictResult.hasConflict) {
      return res.status(409).json({
        success: false,
        message: 'Venue conflict: Another active event is already scheduled at this venue on the selected date and overlapping time slot.',
        conflictingEvent: conflictResult.conflictingEvent,
      });
    }

    const deptList = targetDepartments || eligibility;
    const formattedDepts = Array.isArray(deptList)
      ? deptList.map((d) => String(d).trim()).filter(Boolean)
      : typeof deptList === 'string'
      ? deptList.split(',').map((d) => d.trim()).filter(Boolean)
      : ['All'];

    const finalBannerUrl = bannerUrl || image || '';

    // Create event with organizer ID from req.user and status pending
    const event = await Event.create({
      title: String(title).trim(),
      description: String(description).trim(),
      category,
      venue: String(venue).trim(),
      date: parsedDate,
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
      targetDepartments: formattedDepts.length > 0 ? formattedDepts : ['All'],
      maxSeats: seats,
      bannerUrl: String(finalBannerUrl).trim(),
      organizer: req.user._id,
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Event created successfully and is pending admin approval',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all approved events (Public/Student view)
 * @route   GET /api/events
 * @access  Public
 */
const getApprovedEvents = async (req, res, next) => {
  try {
    const { category, search, department, date } = req.query;

    const query = { status: 'approved' };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { venue: { $regex: search, $options: 'i' } },
      ];
    }

    if (department && department !== 'All') {
      query.targetDepartments = { $in: [department, 'All'] };
    }

    if (date) {
      const filterDate = new Date(date);
      if (!isNaN(filterDate.getTime())) {
        const startOfDay = new Date(filterDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(filterDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        query.date = { $gte: startOfDay, $lte: endOfDay };
      }
    }

    const events = await Event.find(query)
      .populate('organizer', 'name email department')
      .sort({ date: 1, startTime: 1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logged in organizer's own events (all statuses)
 * @route   GET /api/events/my or GET /api/events/my-events
 * @access  Private (Organizer)
 */
const getMyEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ organizer: req.user._id })
      .populate('organizer', 'name email department')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all events in the system (Admin only)
 * @route   GET /api/events/all
 * @access  Private (Admin)
 */
const getAllEvents = async (req, res, next) => {
  try {
    const events = await Event.find()
      .populate('organizer', 'name email department')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get pending events awaiting admin approval
 * @route   GET /api/events/pending
 * @access  Private (Admin)
 */
const getPendingEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ status: 'pending' })
      .populate('organizer', 'name email department')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single event by ID
 * @route   GET /api/events/:id
 * @access  Public / Private (with permission checks)
 */
const getEventById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const event = await Event.findById(req.params.id).populate('organizer', 'name email department');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Permission check for viewing unapproved event
    if (event.status !== 'approved') {
      const organizerIdStr = (event.organizer && event.organizer._id ? event.organizer._id : event.organizer).toString();
      const isOrganizerOwner = req.user && organizerIdStr === req.user._id.toString();
      const isAdmin = req.user && req.user.role === 'admin';

      if (!isOrganizerOwner && !isAdmin) {
        return res.status(404).json({
          success: false,
          message: 'Event not found',
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an event (Only own event for organizer)
 * @route   PUT /api/events/:id
 * @access  Private (Organizer)
 */
const updateEvent = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Authorization check FIRST: Must be owner
    const organizerIdStr = (event.organizer && event.organizer._id ? event.organizer._id : event.organizer).toString();
    if (organizerIdStr !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update another organizer\'s event',
      });
    }

    const {
      title,
      description,
      category,
      venue,
      date,
      startTime,
      endTime,
      targetDepartments,
      eligibility,
      maxSeats,
      registrationLimit,
      bannerUrl,
      image,
    } = req.body;

    const newVenue = venue !== undefined ? String(venue).trim() : event.venue;
    const newDate = date !== undefined ? new Date(date) : event.date;
    const newStartTime = startTime !== undefined ? String(startTime).trim() : event.startTime;
    const newEndTime = endTime !== undefined ? String(endTime).trim() : event.endTime;

    if (isNaN(newDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event date provided',
      });
    }

    // Validate start & end time order
    try {
      if (!isTimeBefore(newStartTime, newEndTime)) {
        return res.status(400).json({
          success: false,
          message: 'Event end time must be strictly after start time',
        });
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid time format',
      });
    }

    // Perform conflict check excluding current event
    const conflictResult = await checkEventConflict({
      venue: newVenue,
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      excludeEventId: event._id,
    });

    if (conflictResult.hasConflict) {
      return res.status(409).json({
        success: false,
        message: 'Venue conflict: Another active event is already scheduled at this venue during the selected date and time slot.',
        conflictingEvent: conflictResult.conflictingEvent,
      });
    }

    // Validate registrationLimit / maxSeats if provided
    const rawSeats = registrationLimit !== undefined ? registrationLimit : maxSeats;
    let seats = event.maxSeats;
    if (rawSeats !== undefined) {
      seats = Number(rawSeats);
      if (isNaN(seats) || seats <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Registration limit / maximum seats must be a positive number',
        });
      }
    }

    // Validate category enum if updated
    if (category) {
      const validCategories = ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        });
      }
    }

    const deptList = targetDepartments || eligibility;
    const formattedDepts = deptList
      ? Array.isArray(deptList)
        ? deptList.map((d) => String(d).trim()).filter(Boolean)
        : typeof deptList === 'string'
        ? deptList.split(',').map((d) => d.trim()).filter(Boolean)
        : event.targetDepartments
      : event.targetDepartments;

    const finalBannerUrl = bannerUrl !== undefined ? bannerUrl : image !== undefined ? image : event.bannerUrl;

    // Apply updates
    event.title = title !== undefined ? String(title).trim() : event.title;
    event.description = description !== undefined ? String(description).trim() : event.description;
    event.category = category || event.category;
    event.venue = newVenue;
    event.date = newDate;
    event.startTime = newStartTime;
    event.endTime = newEndTime;
    event.targetDepartments = formattedDepts;
    event.maxSeats = seats;
    event.bannerUrl = String(finalBannerUrl).trim();

    // Reset status to pending when edited by organizer
    event.status = 'pending';

    await event.save();

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully and submitted for re-approval',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an event (Only own event for organizer)
 * @route   DELETE /api/events/:id
 * @access  Private (Organizer)
 */
const deleteEvent = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Authorization check FIRST: Must be owner
    const organizerIdStr = (event.organizer && event.organizer._id ? event.organizer._id : event.organizer).toString();
    if (organizerIdStr !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete another organizer\'s event',
      });
    }

    await event.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve an event (Admin only)
 * @route   PUT /api/events/:id/approve
 * @access  Private (Admin)
 */
const approveEvent = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    event.status = 'approved';
    event.rejectionReason = '';

    await event.save();

    return res.status(200).json({
      success: true,
      message: 'Event approved successfully',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject an event (Admin only)
 * @route   PUT /api/events/:id/reject
 * @access  Private (Admin)
 */
const rejectEvent = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const { rejectionReason } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    event.status = 'rejected';
    event.rejectionReason = rejectionReason ? String(rejectionReason).trim() : 'Event rejected by Administrator';

    await event.save();

    return res.status(200).json({
      success: true,
      message: 'Event rejected successfully',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve or reject an event status (Admin only)
 * @route   PATCH /api/events/:id/status
 * @access  Private (Admin)
 */
const updateEventStatus = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const { status, rejectionReason } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Status must be either "approved" or "rejected"',
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    event.status = status;
    if (status === 'rejected') {
      event.rejectionReason = rejectionReason ? String(rejectionReason).trim() : 'Event rejected by Administrator';
    } else {
      event.rejectionReason = '';
    }

    await event.save();

    return res.status(200).json({
      success: true,
      message: `Event successfully ${status}`,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Utility endpoint to verify venue and time scheduling conflict
 * @route   POST /api/events/check-conflict
 * @access  Private (Organizer, Admin)
 */
const checkConflictEndpoint = async (req, res, next) => {
  try {
    const { venue, date, startTime, endTime, eventId } = req.body;

    if (!venue || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide venue, date, startTime, and endTime',
      });
    }

    const result = await checkEventConflict({
      venue,
      date,
      startTime,
      endTime,
      excludeEventId: eventId,
    });

    return res.status(200).json({
      success: true,
      hasConflict: result.hasConflict,
      message: result.hasConflict
        ? 'Conflict detected: Another event is scheduled at this venue and time.'
        : 'No scheduling conflict detected.',
      conflictingEvent: result.conflictingEvent || null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
