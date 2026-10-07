const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getUsersForAdmin, getUserByIdForAdmin } = require('../controllers/adminController');

// All routes are protected by JWT auth and require Admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/users', getUsersForAdmin);
router.get('/users/:id', getUserByIdForAdmin);

module.exports = router;
