const mongoose = require('mongoose');

// Target rule: jaise "delivery boy, monthly, 100 deliveries => Rs 500 bonus"
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxLength: 120 },
    recipientType: { type: String, enum: ['user', 'delivery', 'manager', 'seller'], required: true },
    metric: { type: String, required: true }, // spent, orders, deliveries, productsAdded, margin ...
    period: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], required: true },
    target: { type: Number, required: true, min: 1 },
    giftType: { type: String, enum: ['bonus', 'coupon', 'points', 'badge', 'commission', 'other'], default: 'bonus' },
    giftTitle: { type: String, required: true, trim: true, maxLength: 120 },
    amount: { type: Number, default: 0, min: 0 },
    // true = target pura hote hi gift "Given"; false = "Pending", admin approve karega
    autoGrant: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RewardRule', schema);
