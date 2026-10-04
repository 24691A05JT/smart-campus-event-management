/**
 * Helper utility for parsing time strings and checking time interval overlaps
 */

/**
 * Parses a time string (e.g., '10:00 AM', '01:30 PM', '14:30') into minutes from midnight (0 to 1439).
 * @param {string} timeStr - Time string
 * @returns {number} - Minutes from midnight
 */
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') {
    throw new Error('Invalid time string provided');
  }

  const cleaned = timeStr.trim().toUpperCase();
  const is12Hour = cleaned.includes('AM') || cleaned.includes('PM');

  let timePart = cleaned.replace(/(AM|PM)/g, '').trim();
  const parts = timePart.split(':');

  if (parts.length < 2) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  let hours = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time values: ${timeStr}`);
  }

  if (is12Hour) {
    const isPM = cleaned.includes('PM');
    if (hours < 1 || hours > 12) {
      throw new Error(`Invalid 12-hour format: ${timeStr}`);
    }
    if (isPM && hours !== 12) {
      hours += 12;
    } else if (!isPM && hours === 12) {
      hours = 0;
    }
  } else {
    if (hours < 0 || hours > 23) {
      throw new Error(`Invalid 24-hour format: ${timeStr}`);
    }
  }

  return hours * 60 + minutes;
};

/**
 * Checks whether startTime is strictly before endTime.
 * @param {string} startTime - Start time string
 * @param {string} endTime - End time string
 * @returns {boolean}
 */
const isTimeBefore = (startTime, endTime) => {
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  return startMin < endMin;
};

/**
 * Checks if two time intervals [startA, endA] and [startB, endB] overlap.
 * @param {string|number} startA - Start time of first interval
 * @param {string|number} endA - End time of first interval
 * @param {string|number} startB - Start time of second interval
 * @param {string|number} endB - End time of second interval
 * @returns {boolean}
 */
const doTimesOverlap = (startA, endA, startB, endB) => {
  const minStartA = typeof startA === 'number' ? startA : parseTimeToMinutes(startA);
  const minEndA = typeof endA === 'number' ? endA : parseTimeToMinutes(endA);
  const minStartB = typeof startB === 'number' ? startB : parseTimeToMinutes(startB);
  const minEndB = typeof endB === 'number' ? endB : parseTimeToMinutes(endB);

  return minStartA < minEndB && minStartB < minEndA;
};

module.exports = {
  parseTimeToMinutes,
  isTimeBefore,
  doTimesOverlap,
};
