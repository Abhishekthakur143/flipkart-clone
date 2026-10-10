const Razorpay = require('razorpay');
const shortid = require('shortid');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const ErrorHandler = require('../utils/errorHandler');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay Order
exports.createRazorpayOrder = async (req, res, next) => {
  try {
    const { amount } = req.body;

    const payment_capture = 1;
    const currency = 'INR';

    const options = {
      amount: amount * 100, // Convert to paise
      currency,
      receipt: shortid.generate(),
      payment_capture,
    };

    const order = await razorpay.orders.create(options);

    // Save payment record
    await Payment.create({
      user: req.user._id,
     order: order.id,
      razorpayOrderId: order.id,
      amount: amount,
      currency,
      method: 'Online',
    });

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// Verify Razorpay Payment
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return next(new ErrorHandler('Payment verification failed', 400));
    }

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'captured',
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      payment,
      message: 'Payment verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get Razorpay API Key
exports.getRazorpayKey = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    next(error);
  }
};