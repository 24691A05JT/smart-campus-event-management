const {
  getOrganizerAnalytics,
  getAdminAnalytics,
} = require('../services/analyticsService');

/**
 * @desc    Get organizer-level analytics metrics
 * @route   GET /api/analytics/organizer
 * @access  Private (Organizer / Admin)
 */
const getOrganizerAnalyticsController = async (req, res, next) => {
  try {
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Student role cannot access analytics dashboard',
      });
    }

    const targetOrganizerId =
      req.user.role === 'admin' && req.query.organizerId
        ? req.query.organizerId
        : req.user._id;

    const data = await getOrganizerAnalytics(targetOrganizerId);

    return res.status(200).json({
      success: true,
      role: req.user.role,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get system-wide admin analytics metrics
 * @route   GET /api/analytics/admin
 * @access  Private (Admin)
 */
const getAdminAnalyticsController = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Admin role required for system-wide analytics',
      });
    }

    const data = await getAdminAnalytics();

    return res.status(200).json({
      success: true,
      role: 'admin',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get role-appropriate analytics (Admin or Organizer)
 * @route   GET /api/analytics
 * @access  Private (Organizer / Admin)
 */
const getAnalytics = async (req, res, next) => {
  try {
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Students cannot access analytics dashboard',
      });
    }

    if (req.user.role === 'admin') {
      const data = await getAdminAnalytics();
      return res.status(200).json({
        success: true,
        role: 'admin',
        data,
      });
    }

    const data = await getOrganizerAnalytics(req.user._id);
    return res.status(200).json({
      success: true,
      role: 'organizer',
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrganizerAnalyticsController,
  getAdminAnalyticsController,
  getAnalytics,
};
