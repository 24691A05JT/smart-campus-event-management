const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Feedback = require('../models/Feedback');
const User = require('../models/User');

const formatTitle = (t) => {
  const str = t || 'Untitled Event';
  return str.length > 18 ? str.substring(0, 18) + '...' : str;
};

/**
 * Get analytics metrics for a specific organizer's events.
 * @param {String|ObjectId} organizerId 
 * @returns {Object} Organizer analytics data
 */
const getOrganizerAnalytics = async (organizerId) => {
  const orgObjId = new mongoose.Types.ObjectId(organizerId);

  // 1. Fetch organizer's events
  const events = await Event.find({ organizer: orgObjId });
  const eventIds = events.map((e) => e._id);

  const totalEvents = events.length;
  const approvedEvents = events.filter((e) => e.status === 'approved').length;
  const pendingEvents = events.filter((e) => e.status === 'pending').length;
  const rejectedEvents = events.filter((e) => e.status === 'rejected').length;

  if (totalEvents === 0) {
    return {
      summary: {
        totalEvents: 0,
        approvedEvents: 0,
        pendingEvents: 0,
        rejectedEvents: 0,
        totalRegistrations: 0,
        totalAttendance: 0,
        presentCount: 0,
        absentCount: 0,
        unmarkedCount: 0,
        attendanceRate: 0,
        averageRating: 0,
      },
      registrationsByEvent: [],
      attendanceByEvent: [],
      categoryStats: [],
      popularEvents: [],
    };
  }

  // 2. Fetch registrations for organizer's events
  const registrations = await Registration.find({
    event: { $in: eventIds },
    status: 'registered',
  }).populate('event', 'title category');

  const totalRegistrations = registrations.length;
  const presentCount = registrations.filter((r) => r.attendanceStatus === 'present').length;
  const absentCount = registrations.filter((r) => r.attendanceStatus === 'absent').length;
  const unmarkedCount = registrations.filter(
    (r) => !r.attendanceStatus || r.attendanceStatus === 'unmarked'
  ).length;

  const attendanceRate =
    totalRegistrations > 0 ? parseFloat(((presentCount / totalRegistrations) * 100).toFixed(1)) : 0;

  // 3. Fetch feedback for organizer's events
  const feedbacks = await Feedback.find({ event: { $in: eventIds } });
  const totalFeedbacks = feedbacks.length;
  const averageRating =
    totalFeedbacks > 0
      ? parseFloat((feedbacks.reduce((acc, f) => acc + f.rating, 0) / totalFeedbacks).toFixed(1))
      : 0;

  // 4. Registration & Attendance breakdown per event
  const eventStatsMap = {};
  events.forEach((evt) => {
    eventStatsMap[evt._id.toString()] = {
      id: evt._id,
      title: evt.title,
      category: evt.category,
      maxSeats: evt.maxSeats || 50,
      registeredCount: 0,
      presentCount: 0,
      absentCount: 0,
    };
  });

  registrations.forEach((reg) => {
    if (!reg.event) return;
    const evtIdStr = (reg.event._id || reg.event).toString();
    if (eventStatsMap[evtIdStr]) {
      eventStatsMap[evtIdStr].registeredCount += 1;
      if (reg.attendanceStatus === 'present') {
        eventStatsMap[evtIdStr].presentCount += 1;
      } else if (reg.attendanceStatus === 'absent') {
        eventStatsMap[evtIdStr].absentCount += 1;
      }
    }
  });

  const eventStatsList = Object.values(eventStatsMap);

  // 5. Category-wise event statistics
  const categoryMap = {};
  events.forEach((evt) => {
    const cat = evt.category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const categoryStats = Object.keys(categoryMap).map((cat) => ({
    category: cat,
    count: categoryMap[cat],
  }));

  // 6. Popular events ranked by registeredCount
  const popularEvents = [...eventStatsList]
    .sort((a, b) => b.registeredCount - a.registeredCount)
    .slice(0, 5);

  return {
    summary: {
      totalEvents,
      approvedEvents,
      pendingEvents,
      rejectedEvents,
      totalRegistrations,
      totalAttendance: presentCount,
      presentCount,
      absentCount,
      unmarkedCount,
      attendanceRate,
      averageRating,
    },
    registrationsByEvent: eventStatsList.map((e) => ({
      name: formatTitle(e.title),
      fullTitle: e.title || 'Untitled Event',
      registrations: e.registeredCount,
      capacity: e.maxSeats,
    })),
    attendanceByEvent: eventStatsList.map((e) => ({
      name: formatTitle(e.title),
      fullTitle: e.title || 'Untitled Event',
      present: e.presentCount,
      absent: e.absentCount,
      unmarked: e.registeredCount - (e.presentCount + e.absentCount),
    })),
    categoryStats,
    popularEvents,
  };
};

/**
 * Get system-wide analytics metrics for Admin dashboard.
 * @returns {Object} System-wide analytics data
 */
const getAdminAnalytics = async () => {
  // 1. System Users breakdown
  const rawUsers = await User.find({}, 'role department');
  const users = Array.isArray(rawUsers) ? rawUsers.filter(Boolean) : [];
  const totalUsers = users.length;
  const totalStudents = users.filter((u) => u && u.role === 'student').length;
  const totalOrganizers = users.filter((u) => u && u.role === 'organizer').length;
  const totalAdmins = users.filter((u) => u && u.role === 'admin').length;

  // 2. Events breakdown
  const events = await Event.find({}).populate('organizer', 'name department');
  const totalEvents = events.length;
  const approvedEvents = events.filter((e) => e.status === 'approved').length;
  const pendingEvents = events.filter((e) => e.status === 'pending').length;
  const rejectedEvents = events.filter((e) => e.status === 'rejected').length;

  // 3. Registrations breakdown
  const registrations = await Registration.find({ status: 'registered' }).populate(
    'student',
    'department'
  );
  const totalRegistrations = registrations.length;
  const presentCount = registrations.filter((r) => r.attendanceStatus === 'present').length;
  const absentCount = registrations.filter((r) => r.attendanceStatus === 'absent').length;
  const unmarkedCount = registrations.filter(
    (r) => !r.attendanceStatus || r.attendanceStatus === 'unmarked'
  ).length;

  const overallAttendanceRate =
    totalRegistrations > 0 ? parseFloat(((presentCount / totalRegistrations) * 100).toFixed(1)) : 0;

  // 4. Feedback breakdown
  const feedbacks = await Feedback.find({});
  const totalFeedbacks = feedbacks.length;
  const averageRating =
    totalFeedbacks > 0
      ? parseFloat((feedbacks.reduce((acc, f) => acc + f.rating, 0) / totalFeedbacks).toFixed(1))
      : 0;

  // 5. Category distribution
  const categoryMap = {};
  events.forEach((evt) => {
    const cat = evt.category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const categoryDistribution = Object.keys(categoryMap).map((cat) => ({
    name: cat,
    category: cat,
    value: categoryMap[cat],
    count: categoryMap[cat],
  }));

  // 6. Department participation breakdown
  const deptMap = {};
  registrations.forEach((reg) => {
    const dept = reg.student?.department || 'General';
    deptMap[dept] = (deptMap[dept] || 0) + 1;
  });
  const departmentParticipation = Object.keys(deptMap).map((dept) => ({
    department: dept,
    registrations: deptMap[dept],
  }));

  // 7. Popular events ranked by registeredCount
  const popularEvents = [...events]
    .sort((a, b) => (b.registeredCount || 0) - (a.registeredCount || 0))
    .slice(0, 5)
    .map((e) => ({
      id: e._id,
      title: e.title,
      category: e.category,
      organizerName: e.organizer?.name || 'Faculty',
      registeredCount: e.registeredCount || 0,
      maxSeats: e.maxSeats || 50,
      fillPercentage: Math.round(((e.registeredCount || 0) / (e.maxSeats || 50)) * 100),
    }));

  return {
    summary: {
      totalUsers,
      totalStudents,
      totalOrganizers,
      totalAdmins,
      totalEvents,
      approvedEvents,
      pendingEvents,
      rejectedEvents,
      totalRegistrations,
      totalAttendance: presentCount,
      presentCount,
      absentCount,
      unmarkedCount,
      overallAttendanceRate,
      averageRating,
    },
    categoryDistribution,
    departmentParticipation,
    popularEvents,
    eventsOverview: events.map((e) => ({
      name: formatTitle(e.title),
      fullTitle: e.title || 'Untitled Event',
      registrations: e.registeredCount || 0,
      capacity: e.maxSeats || 50,
    })),
  };
};

module.exports = {
  getOrganizerAnalytics,
  getAdminAnalytics,
};
