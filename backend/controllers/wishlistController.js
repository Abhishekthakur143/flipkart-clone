const User = require('../models/User');
const Product = require('../models/Product');
const ErrorHandler = require('../utils/errorHandler');

// Get Wishlist
exports.getWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    res.status(200).json({
      success: true,
      wishlist: user.wishlist,
    });
  } catch (error) {
    next(error);
  }
};

// Add to Wishlist (Toggle)
exports.addToWishlist = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(new ErrorHandler('Product not found', 404));
    }

    const user = await User.findById(req.user._id);
    const isAlreadyInWishlist = user.wishlist.includes(req.params.id);

    if (isAlreadyInWishlist) {
      user.wishlist = user.wishlist.filter(
        (id) => id.toString() !== req.params.id
      );
    } else {
      user.wishlist.push(req.params.id);
    }

    await user.save();
    
    // ✅ YEH LINE MAGIC KAREGI - ID KE SAATH SAATH PURA PRODUCT DATA BHEJEGA
    await user.populate('wishlist');

    res.status(200).json({
      success: true,
      message: isAlreadyInWishlist ? 'Removed from wishlist' : 'Added to wishlist',
      wishlist: user.wishlist, 
    });
  } catch (error) {
    next(error);
  }
};

// Remove from Wishlist
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    user.wishlist = user.wishlist.filter(
      (id) => id.toString() !== req.params.id
    );

    await user.save();
    
    // ✅ YAHAN BHI PURA DATA BHEJENGE
    await user.populate('wishlist');

    res.status(200).json({
      success: true,
      message: 'Removed from wishlist',
      wishlist: user.wishlist,
    });
  } catch (error) {
    next(error);
  }
};