const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const partnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Please enter your name'], trim: true, maxLength: [50, 'Name cannot exceed 50 characters'] },
    email: {
      type: String,
      required: [true, 'Please enter your email'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Please enter your phone number'],
      match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'],
    },
    password: { type: String, required: true, minLength: [6, 'Password should be minimum 6 characters'], select: false },
    vehicleType: { type: String, enum: ['Bike', 'Scooter', 'Cycle', 'EV'], default: 'Bike' },
    vehicleNumber: { type: String, default: '', trim: true, uppercase: true, maxLength: 20 },
    city: { type: String, default: '', trim: true, maxLength: 60 },
    isActive: { type: Boolean, default: true },      // admin can disable a partner
    isAvailable: { type: Boolean, default: true },   // partner's own online/offline switch
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
  },
  { timestamps: true }
);

partnerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

partnerSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Separate secret from customer tokens: a delivery token can NEVER open customer/admin routes (and vice versa)
partnerSchema.statics.secret = function () {
  return process.env.DELIVERY_JWT_SECRET || `${process.env.JWT_SECRET}::delivery`;
};

partnerSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id, type: 'delivery' }, this.constructor.secret(), {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

module.exports = mongoose.model('DeliveryPartner', partnerSchema);
