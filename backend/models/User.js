const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter your name'],
      maxLength: [50, 'Name cannot exceed 50 characters'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please enter your email'],
      unique: true,
      validate: [validator.isEmail, 'Please enter valid email'],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please enter your password'],
      minLength: [6, 'Password should be minimum 6 characters'],
      select: false, // Don't include password in queries by default
    },
    avatar: {
      public_id: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'manager', 'seller', 'superadmin'],
      default: 'user',
    },
    phone: {
      type: String,
      default: '',
    },
    // Staff accounts (manager/seller) ko admin disable kar sakta hai
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addresses: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        addressLine1: { type: String, required: true },
        addressLine2: { type: String, default: '' },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        country: { type: String, default: 'India' },
        isDefault: { type: Boolean, default: false },
        addressType: {
          type: String,
          enum: ['Home', 'Work', 'Other'],
          default: 'Home',
        },
      },
    ],
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    otp: String,
    otpExpire: Date,
    otpAttempts: { type: Number, default: 0 },

    // ---- Admin panel lock (password + code word + security answer) ----
    // Hashes kabhi API response me nahi jaate (select: false).
    adminCodeHash: { type: String, select: false },
    adminAnswerHash: { type: String, select: false },
    adminQuestion: { type: String, default: '', maxLength: 160 },
    adminFailed: { type: Number, default: 0, select: false },
    adminLockUntil: { type: Date, select: false },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Generate password reset token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

  return resetToken;
};

// Generate OTP (cryptographically random, resets the wrong-attempt counter)
userSchema.methods.generateOTP = function () {
  const otp = String(crypto.randomInt(100000, 1000000));
  this.otp = otp;
  this.otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  this.otpAttempts = 0;
  return otp;
};

module.exports = mongoose.model('User', userSchema);
