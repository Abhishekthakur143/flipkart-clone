const express = require('express');
const {
  createRazorpayOrder,
  verifyPayment,
  getRazorpayKey,
} = require('../controllers/paymentController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.get('/key', isAuthenticated, getRazorpayKey);
router.post('/create-order', isAuthenticated, createRazorpayOrder);
router.post('/verify', isAuthenticated, verifyPayment);

module.exports = router;