const { getPersonalizedRecommendations } = require('../services/recommendationService');

/**
 * @desc    Get personalized event recommendations for authenticated student
 * @route   GET /api/recommendations
 * @access  Private (Student)
 */
const getRecommendations = async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Recommendations are personalized for students only',
      });
    }

    const recommendations = await getPersonalizedRecommendations(req.user);

    return res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations,
      recommendations, // Compatible format
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendations,
};
