const express = require('express');
const {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  getUserDetails,
  updatePassword,
  updateProfile,
  verifyEmail,
  resendOTP,
  addAddress,
  updateAddress,
  deleteAddress,
  getAllUsers,
  getSingleUser,
  updateUserRole,
  deleteUser,
} = require('../controllers/authController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);
router.post('/password/forgot', forgotPassword);
router.put('/password/reset/:token', resetPassword);

// Protected routes
router.get('/logout', logoutUser);
router.get('/me', isAuthenticated, getUserDetails);
router.put('/password/update', isAuthenticated, updatePassword);
router.put('/me/update', isAuthenticated, updateProfile);

// Address routes
router.post('/address/add', isAuthenticated, addAddress);
router.put('/address/:id', isAuthenticated, updateAddress);
router.delete('/address/:id', isAuthenticated, deleteAddress);

// Admin routes
router.get('/admin/users', isAuthenticated, isAdmin, getAllUsers);
router.get('/admin/user/:id', isAuthenticated, isAdmin, getSingleUser);
router.put('/admin/user/:id', isAuthenticated, isAdmin, updateUserRole);
router.delete('/admin/user/:id', isAuthenticated, isAdmin, deleteUser);

module.exports = router;