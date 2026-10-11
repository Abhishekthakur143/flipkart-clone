const User = require('../models/User');
const ErrorHandler = require('../utils/errorHandler');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// Register User
exports.registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new ErrorHandler('User already exists with this email', 400));
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    // Generate OTP for email verification
    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });

    // Send OTP email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Email Verification OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2874f0;">Verify Your Email</h2>
            <p>Your verification OTP is:</p>
            <h1 style="color: #2874f0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
            <p>This OTP is valid for 10 minutes.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('OTP email failed:', error.message);
      await User.findByIdAndDelete(user._id);
      return next(new ErrorHandler('Error sending OTP email', 500));
    }

    sendTokenResponse(user, 201, res, 'Registration successful! Please verify your email.');
  } catch (error) {
    next(error);
  }
};

// Login User
exports.loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ErrorHandler('Please enter email and password', 400));
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new ErrorHandler('Invalid email or password', 401));
    }

    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
      return next(new ErrorHandler('Invalid email or password', 401));
    }

    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// Logout User
exports.logoutUser = async (req, res, next) => {
  res.cookie('token', null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

// Get User Details
exports.getUserDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Update Password
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

    if (!isPasswordMatched) {
      return next(new ErrorHandler('Old password is incorrect', 400));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res, 'Password updated successfully');
  } catch (error) {
    next(error);
  }
};

// Update Profile
exports.updateProfile = async (req, res, next) => {
  try {
    const newUserData = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
    };

    if (req.body.avatar !== undefined) {
      const user = await User.findById(req.user.id);
      // Delete old avatar from cloudinary
      if (user.avatar.public_id) {
        const cloudinary = require('../config/cloudinary');
        await cloudinary.uploader.destroy(user.avatar.public_id);
      }

      newUserData.avatar = req.body.avatar;
    }

    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      user,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Verify Email OTP (needs email + otp; max 5 wrong attempts per OTP)
exports.verifyEmail = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const otp = String(req.body.otp || '').trim();

    if (!email || !otp) {
      return next(new ErrorHandler('Email and OTP are required', 400));
    }

    const user = await User.findOne({ email });

    if (!user || !user.otp || !user.otpExpire || user.otpExpire < Date.now()) {
      return next(new ErrorHandler('Invalid or expired OTP', 400));
    }

    if ((user.otpAttempts || 0) >= 5) {
      user.otp = undefined;
      user.otpExpire = undefined;
      user.otpAttempts = 0;
      await user.save({ validateBeforeSave: false });
      return next(new ErrorHandler('Too many wrong attempts. Please request a new OTP.', 429));
    }

    const given = Buffer.from(otp);
    const real = Buffer.from(user.otp);
    if (given.length !== real.length || !crypto.timingSafeEqual(given, real)) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });
      return next(new ErrorHandler('Invalid or expired OTP', 400));
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res, 'Email verified successfully');
  } catch (error) {
    next(error);
  }
};

// Resend OTP
exports.resendOTP = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    if (user.isVerified) {
      return next(new ErrorHandler('Email already verified', 400));
    }

    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });

    await sendEmail({
      email: user.email,
      subject: 'Email Verification OTP - Resent',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2874f0;">Verify Your Email</h2>
          <p>Your new verification OTP is:</p>
          <h1 style="color: #2874f0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          <p>This OTP is valid for 10 minutes.</p>
        </div>
      `,
    });

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return next(new ErrorHandler('User not found with this email', 404));
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;

    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2874f0;">Password Reset</h2>
        <p>You requested a password reset. Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #2874f0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
        <p>This link is valid for 15 minutes only.</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset - Flipkart Clone',
        html: message,
      });

      res.status(200).json({
        success: true,
        message: `Email sent to ${user.email} successfully`,
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new ErrorHandler('Error sending email', 500));
    }
  } catch (error) {
    next(error);
  }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorHandler('Reset password token is invalid or expired', 400));
    }

    if (req.body.password !== req.body.confirmPassword) {
      return next(new ErrorHandler('Passwords do not match', 400));
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    sendTokenResponse(user, 200, res, 'Password reset successful');
  } catch (error) {
    next(error);
  }
};

// --- Address Management ---
exports.addAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    // If this is the first address or isDefault is true, set all others to false
    if (req.body.isDefault || user.addresses.length === 0) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
      req.body.isDefault = true;
    }

    user.addresses.push(req.body);
    await user.save();

    res.status(201).json({
      success: true,
      user,
      message: 'Address added successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === req.params.id
    );

    if (addressIndex === -1) {
      return next(new ErrorHandler('Address not found', 404));
    }

    if (req.body.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    user.addresses[addressIndex] = { ...user.addresses[addressIndex], ...req.body };
    await user.save();

    res.status(200).json({
      success: true,
      user,
      message: 'Address updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    user.addresses = user.addresses.filter(
      (addr) => addr._id.toString() !== req.params.id
    );

    // If deleted address was default and there are other addresses
    if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      user,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get All Users
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      users,
      count: users.length,
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get Single User
exports.getSingleUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update User Role
exports.updateUserRole = async (req, res, next) => {
  try {
    const newUserData = {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
    };

    const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    res.status(200).json({
      success: true,
      user,
      message: 'User updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Delete User
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Helper: Send token response
const sendTokenResponse = (user, statusCode, res, message) => {
  const token = user.getJWTToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
      },
      message,
    });
};