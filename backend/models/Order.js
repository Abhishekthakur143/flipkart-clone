const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        image: { type: String, required: true },
        size: { type: String, default: '' },
        color: { type: String, default: '' },
      },
    ],
    shippingInfo: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: 'India' },
    },
    paymentInfo: {
      id: { type: String, required: true },
      status: { type: String, required: true },
    },
    paidAt: {
      type: Date,
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    discountPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    orderStatus: {
      type: String,
      required: true,
      default: 'Processing',
      enum: [
        'Processing',
        'Confirmed',
        'Shipped',
        'Out for Delivery',
        'Delivered',
        'Cancelled',
        'Returned',
      ],
    },
    deliveredAt: Date,
    couponUsed: {
      type: String,
      default: '',
    },
    trackingId: {
      type: String,
      default: '',
    },
    trackingUpdates: [
      {
        status: { type: String, required: true },
        location: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
        message: { type: String, default: '' },
      },
    ],
    paymentMethod: {
      type: String,
      enum: ['Online', 'COD'],
      required: true,
    },

    // ---- Delivery partner workflow (added) ----
    delivery: {
      partner: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner', index: true },
      status: {
        type: String,
        enum: ['Assigned', 'Picked Up', 'Out for Delivery', 'Delivered', 'Failed'],
      },
      assignedAt: Date,
      pickedUpAt: Date,
      outForDeliveryAt: Date,
      deliveredAt: Date,
      failedAt: Date,
      failReason: String,
      attempts: { type: Number, default: 0 },
      payout: { type: Number, default: 0 },
      codCollected: { type: Number, default: 0 },
      // delivery OTP (hashed, never returned by default)
      otpHash: { type: String, select: false },
      otpExpire: { type: Date, select: false },
      otpAttempts: { type: Number, default: 0, select: false },
      otpSentAt: { type: Date, select: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
