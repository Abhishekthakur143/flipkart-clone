const mongoose = require('mongoose');

// Ek gift ka record: kisko, kab, kya diya (manual ya auto)
const schema = new mongoose.Schema(
  {
    recipientType: { type: String, enum: ['user', 'delivery', 'manager', 'seller', 'admin'], required: true, index: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    recipientName: { type: String, default: '' },
    title: { type: String, required: true, trim: true, maxLength: 120 },
    giftType: { type: String, enum: ['bonus', 'coupon', 'points', 'badge', 'commission', 'other'], default: 'bonus' },
    amount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, default: '' },
    note: { type: String, default: '', maxLength: 300 },
    source: { type: String, enum: ['manual', 'auto'], default: 'manual' },
    rule: { type: mongoose.Schema.Types.ObjectId, ref: 'RewardRule' },
    periodKey: { type: String, default: '' }, // e.g. monthly:2026-11-01
    achieved: { type: Number, default: 0 },
    // Pending = admin approval baaki, Given = mil gaya, Rejected = admin ne mana kiya
    status: { type: String, enum: ['Pending', 'Given', 'Rejected'], default: 'Given', index: true },
    givenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    givenAt: Date,
  },
  { timestamps: true }
);

// Ek rule se ek banda ek period me sirf ek hi baar gift paye
schema.index(
  { rule: 1, recipientId: 1, periodKey: 1 },
  { unique: true, partialFilterExpression: { rule: { $exists: true } } }
);

module.exports = mongoose.model('Reward', schema);
