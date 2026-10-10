const Coupon = require('../models/Coupon');
const ErrorHandler = require('../utils/errorHandler');

// Apply Coupon
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code, orderAmount } = req.body;

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      validFrom: { $lte: new Date() },
      validTo: { $gte: new Date() },
    });

    if (!coupon) {
      return next(new ErrorHandler('Invalid or expired coupon code', 400));
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return next(new ErrorHandler('Coupon usage limit reached', 400));
    }

    if (orderAmount < coupon.minimumOrderValue) {
      return next(
        new ErrorHandler(
          `Minimum order amount should be ₹${coupon.minimumOrderValue}`,
          400
        )
      );
    }

    // Check per user limit
    const userUsage = coupon.userUsage.find(
      (u) => u.user.toString() === req.user._id.toString()
    );
    if (userUsage && userUsage.count >= coupon.perUserLimit) {
      return next(new ErrorHandler('You have already used this coupon', 400));
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (orderAmount * coupon.discountValue) / 100;
      if (coupon.maximumDiscount > 0) {
        discountAmount = Math.min(discountAmount, coupon.maximumDiscount);
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    discountAmount = Math.min(discountAmount, orderAmount);

    res.status(200).json({
      success: true,
      discountAmount,
      couponCode: coupon.code,
      message: 'Coupon applied successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Create Coupon
exports.createCoupon = async (req, res, next) => {
  try {
    req.body.code = req.body.code.toUpperCase();
    const coupon = await Coupon.create(req.body);

    res.status(201).json({
      success: true,
      coupon,
      message: 'Coupon created successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get All Coupons
exports.getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      coupons,
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update Coupon
exports.updateCoupon = async (req, res, next) => {
  try {
    if (req.body.code) req.body.code = req.body.code.toUpperCase();

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!coupon) {
      return next(new ErrorHandler('Coupon not found', 404));
    }

    res.status(200).json({
      success: true,
      coupon,
      message: 'Coupon updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Delete Coupon
exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return next(new ErrorHandler('Coupon not found', 404));
    }

    await coupon.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};