const express = require('express');
const {
  applyCoupon,
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
} = require('../controllers/couponController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/apply', isAuthenticated, applyCoupon);

// Admin routes
router.post('/admin/new', isAuthenticated, isAdmin, createCoupon);
router.get('/admin/all', isAuthenticated, isAdmin, getAllCoupons);
router.put('/admin/:id', isAuthenticated, isAdmin, updateCoupon);
router.delete('/admin/:id', isAuthenticated, isAdmin, deleteCoupon);

module.exports = router;