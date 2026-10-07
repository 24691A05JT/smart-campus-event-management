const User = require('../models/User');

/**
 * @desc    Get list of all registered users (Admin only)
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
const getUsersForAdmin = async (req, res, next) => {
  try {
    const { search, role } = req.query;

    const query = {};

    // Filter by role if specified
    if (role && ['student', 'organizer', 'admin'].includes(role.toLowerCase())) {
      query.role = role.toLowerCase();
    }

    // Search by name or email if specified
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { email: searchRegex }, { department: searchRegex }];
    }

    // Exclude password field explicitly for security
    const users = await User.find(query).select('-password').sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user details by ID (Admin only)
 * @route   GET /api/admin/users/:id
 * @access  Private (Admin)
 */
const getUserByIdForAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsersForAdmin,
  getUserByIdForAdmin,
};
