const Event = require('../models/Event');
const { parseTimeToMinutes, doTimesOverlap } = require('../utils/timeUtils');

/**
 * Checks for scheduling conflicts at the specified venue and date.
 * An event conflicts if another active event at the same venue on the same date has an overlapping time range.
 * Rejected and cancelled events are ignored.
 *
 * @param {Object} params
 * @param {string} params.venue - Venue name
 * @param {string|Date} params.date - Event date
 * @param {string} params.startTime - Start time string
 * @param {string} params.endTime - End time string
 * @param {string} [params.excludeEventId] - Event ID to exclude when checking updates
 * @returns {Promise<{ hasConflict: boolean, conflictingEvent?: Object }>}
 */
const checkEventConflict = async ({ venue, date, startTime, endTime, excludeEventId = null }) => {
  if (!venue || !date || !startTime || !endTime) {
    throw new Error('Missing parameters for conflict check');
  }

  const newStartMin = parseTimeToMinutes(startTime);
  const newEndMin = parseTimeToMinutes(endTime);

  const targetDate = new Date(date);
  if (isNaN(targetDate.getTime())) {
    throw new Error('Invalid date provided for conflict check');
  }

  // Create start and end of day boundaries
  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const query = {
    venue: { $regex: new RegExp(`^${venue.trim()}$`, 'i') },
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['rejected', 'cancelled'] },
  };

  if (excludeEventId) {
    query._id = { $ne: excludeEventId };
  }

  const existingEvents = await Event.find(query);

  for (const existing of existingEvents) {
    const existingStartMin = parseTimeToMinutes(existing.startTime);
    const existingEndMin = parseTimeToMinutes(existing.endTime);

    if (doTimesOverlap(newStartMin, newEndMin, existingStartMin, existingEndMin)) {
      return {
        hasConflict: true,
        conflictingEvent: {
          _id: existing._id,
          title: existing.title,
          venue: existing.venue,
          date: existing.date,
          startTime: existing.startTime,
          endTime: existing.endTime,
          status: existing.status,
        },
      };
    }
  }

  return { hasConflict: false };
};

module.exports = {
  checkEventConflict,
};
