const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyEmail,
  loginUser,
  googleLogin,
  getUserProfile,
  getAdminStats,
} = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/register', registerUser);
router.get('/verify-email', verifyEmail);
router.post('/login', loginUser);
router.post('/google', googleLogin);
router.get('/profile', protect, getUserProfile);
// SEC-01 fix: admin statistics need an admin login
router.get('/stats', protect, authorize('admin'), getAdminStats);

module.exports = router;