const User = require('../models/User');
const generateToken = require('../utils/generateToken');

/**
 * @desc    Register a new user (Student / Organizer / Admin)
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, interests } = req.body;

    // Validate required fields
    if (!name || !email || !password || !department) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password, and department',
      });
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // Security check: Do not allow public registration to create an admin account
    const requestedRole = role ? String(role).toLowerCase() : 'student';
    if (requestedRole === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Public registration for admin accounts is not allowed',
      });
    }

    const userRole = requestedRole === 'organizer' ? 'organizer' : 'student';

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email address',
      });
    }

    // Format interests array
    const userInterests = Array.isArray(interests)
      ? interests.map((i) => String(i).trim()).filter(Boolean)
      : typeof interests === 'string'
      ? interests.split(',').map((i) => i.trim()).filter(Boolean)
      : [];

    // Create new user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: userRole,
      department: department.trim(),
      interests: userInterests,
      isApproved: true,
    });

    // Generate JWT Token
    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        interests: user.interests,
        isApproved: user.isApproved,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email and password presence
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user by email and explicitly include password
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT Token
    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        interests: user.interests,
        isApproved: user.isApproved,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logged in user profile
 * @route   GET /api/auth/me
 * @access  Private (JWT Protected)
 */
const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
