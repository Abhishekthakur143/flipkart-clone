const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const ErrorHandler = require('../utils/errorHandler');
const APIFeatures = require('../utils/apiFeatures');
const cloudinary = require('../config/cloudinary');
 
// ✅ PRICE LIMIT (yahan se badal sakte ho, 0 = band)
const MIN_PRICE = 0; // isse KAM price wale products nahi dikhenge (0 = band)
const MAX_PRICE = 0; // isse ZYADA price wale products nahi dikhenge (0 = band)
 
const priceCondition = () => {
  const cond = {};
  if (MIN_PRICE > 0) cond.$gte = MIN_PRICE;
  if (MAX_PRICE > 0) cond.$lte = MAX_PRICE;
  return Object.keys(cond).length ? { price: cond } : null;
};
 
// Get All Products
exports.getAllProducts = async (req, res, next) => {
  try {
    const resultPerPage = req.query.limit ? Number(req.query.limit) : 12;
 
    const productsCount = await Product.countDocuments({
      isActive: true,
      ...(priceCondition() || {}),
    });
 
    // ✅ FIX: category ko safe banaya (naam/slug/ObjectId sab chalega, khaali -> hata do)
    const query = { ...req.query };
    const baseFilter = { isActive: true };
    const priceCond = priceCondition();
    if (priceCond) baseFilter.$and = [priceCond]; // $and se, taaki frontend ka price filter isse override na kare
 
    if (typeof query.category === 'string') {
      const value = query.category.trim();
      delete query.category; // category ka filter hum khud lagayenge
 
      if (value !== '') {
        let categoryIds = [];
 
        if (/^[0-9a-fA-F]{24}$/.test(value)) {
          // seedhi ObjectId aayi
          categoryIds = [value];
        } else {
          const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 
          // 1) exact slug/name, 2) na mile to partial match (home -> Home & Kitchen)
          let cats = await Category.find({
            $or: [
              { slug: value.toLowerCase() },
              { name: new RegExp(`^${escaped}$`, 'i') },
            ],
          });
 
          if (cats.length === 0) {
            cats = await Category.find({
              $or: [
                { name: new RegExp(escaped, 'i') },
                { slug: new RegExp(escaped, 'i') },
              ],
            });
          }
 
          categoryIds = cats.map((c) => c._id);
        }
 
        // sub-categories ke products bhi dikhao (parentCategory wale)
        if (categoryIds.length > 0) {
          const children = await Category.find({
            parentCategory: { $in: categoryIds },
          }).select('_id');
          categoryIds = [...categoryIds, ...children.map((c) => c._id)];
        }
 
        // category mili nahi to khaali list bhej do, error nahi
        if (categoryIds.length === 0) {
          return res.status(200).json({
            success: true,
            products: [],
            productsCount,
            resultPerPage,
            filteredProductsCount: 0,
          });
        }
 
        baseFilter.category = { $in: categoryIds };
      }
    }
 
    const apiFeatures = new APIFeatures(
      Product.find(baseFilter).populate('category', 'name slug'),
      query
    )
      .search()
      .filter()
      .sort();
 
    // ✅ FIX: .clone() lagaya, warna same query dobara execute karne pe "Query was already executed" aata hai
    let products = await apiFeatures.query.clone();
    const filteredProductsCount = products.length;
 
    apiFeatures.pagination(resultPerPage);
    products = await apiFeatures.query;
 
    res.status(200).json({
      success: true,
      products,
      productsCount,
      resultPerPage,
      filteredProductsCount,
    });
  } catch (error) {
    next(error);
  }
};
 
// Get Product Details
exports.getProductDetails = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      'category',
      'name slug'
    );
 
    if (!product) {
      return next(new ErrorHandler('Product not found', 404));
    }
 
    // Get similar products
    // ✅ FIX: category missing/delete ho chuki ho (null) to crash na ho
    const similarProducts = product.category
      ? await Product.find({
          category: product.category._id,
          _id: { $ne: product._id },
          isActive: true,
          ...(priceCondition() || {}),
        }).limit(8)
      : [];
 
    res.status(200).json({
      success: true,
      product,
      similarProducts,
    });
  } catch (error) {
    next(error);
  }
};
 
// Admin: Create Product
exports.createProduct = async (req, res, next) => {
  try {
    // Data types ko ensure karein (String na jaye)
    req.body.price = Number(req.body.price) || 0;
    req.body.cuttedPrice = Number(req.body.cuttedPrice) || 0;
    req.body.stock = Number(req.body.stock) || 0;
 
    // Upload images to cloudinary
    let images = [];
    if (typeof req.body.images === 'string') {
      images.push(req.body.images);
    } else if (Array.isArray(req.body.images)) {
      images = req.body.images;
    }
 
    const imagesLinks = [];
 
    // Agar user ne image upload ki hai
    if (images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const result = await cloudinary.uploader.upload(images[i], {
          folder: 'products',
          width: 800,
          crop: 'scale',
        });
 
        imagesLinks.push({
          public_id: result.public_id,
          url: result.secure_url,
        });
      }
    } else {
      // Agar image nahi di hai, toh dummy image laga do (Error nahi aayega)
      imagesLinks.push({
        public_id: 'sample',
        url: 'https://via.placeholder.com/150',
      });
    }
 
    req.body.images = imagesLinks;
    req.body.user = req.user.id;
 
    // Highlights ko safe banaana
    if (typeof req.body.highlights === 'string') {
      req.body.highlights = req.body.highlights.split(',').map(h => h.trim()).filter(Boolean);
    } else {
      req.body.highlights = [];
    }
 
    // ✅ SPECIFICATIONS KO SAFE BANAANA
    if (typeof req.body.specifications === 'string' || !req.body.specifications) {
      req.body.specifications = []; // Agar string ya empty hai, toh khali array bhej do
    }
 
    const product = await Product.create(req.body);
 
    res.status(201).json({
      success: true,
      product,
      message: 'Product created successfully',
    });
  } catch (error) {
    // 🔥 YE LINE ASLI ERROR TERMINAL MEIN LAAYEGI
    console.log("=== PRODUCT CREATION ERROR ===", error);
 
    return next(new ErrorHandler(error.message || 'Product creation failed', 500));
  }
};
 
// Admin: Update Product
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);
 
    if (!product) {
      return next(new ErrorHandler('Product not found', 404));
    }
 
    // Highlights / specifications ko safe banaana (string aaye to crash na ho)
    if (typeof req.body.highlights === 'string') {
      req.body.highlights = req.body.highlights
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean);
    }
    if (typeof req.body.specifications === 'string') {
      try {
        req.body.specifications = JSON.parse(req.body.specifications);
      } catch (e) {
        delete req.body.specifications;
      }
    }
 
    // Handle image updates
    if (req.body.images !== undefined) {
      let incoming = [];
      if (typeof req.body.images === 'string') {
        incoming.push(req.body.images);
      } else if (Array.isArray(req.body.images)) {
        incoming = req.body.images;
      }
 
      const imagesLinks = [];
 
      for (let i = 0; i < incoming.length; i++) {
        const img = incoming[i];
 
        // 1) Purani image object ({ public_id, url }) -> waise hi rakho
        if (img && typeof img === 'object' && img.public_id && img.url) {
          imagesLinks.push({ public_id: img.public_id, url: img.url });
          continue;
        }
 
        if (typeof img !== 'string' || img.trim() === '') continue;
 
        // 2) Nayi image (base64) -> cloudinary pe upload karo
        if (img.startsWith('data:')) {
          const result = await cloudinary.uploader.upload(img, {
            folder: 'products',
            width: 800,
            crop: 'scale',
          });
 
          imagesLinks.push({
            public_id: result.public_id,
            url: result.secure_url,
          });
          continue;
        }
 
        // 3) Purani image ka URL -> dobara upload mat karo, pehle wali rakho
        const existing = product.images.find((old) => old.url === img);
        if (existing) {
          imagesLinks.push({ public_id: existing.public_id, url: existing.url });
          continue;
        }
 
        // 4) Koi aur URL -> upload try karo, fail ho to skip (error nahi)
        try {
          const result = await cloudinary.uploader.upload(img, {
            folder: 'products',
            width: 800,
            crop: 'scale',
          });
          imagesLinks.push({
            public_id: result.public_id,
            url: result.secure_url,
          });
        } catch (uploadError) {
          console.log('Image skip kiya (upload fail):', img, uploadError.message);
        }
      }
 
      if (imagesLinks.length > 0) {
        // Sirf wahi purani images delete karo jo ab use nahi ho rahi
        const keptIds = imagesLinks.map((im) => im.public_id);
        for (let i = 0; i < product.images.length; i++) {
          if (!keptIds.includes(product.images[i].public_id)) {
            try {
              await cloudinary.uploader.destroy(product.images[i].public_id);
            } catch (destroyError) {
              console.log('Purani image delete fail:', destroyError.message);
            }
          }
        }
        req.body.images = imagesLinks;
      } else {
        // Koi valid image nahi mili -> purani images ko mat chhedo
        delete req.body.images;
      }
    }
 
    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
 
    res.status(200).json({
      success: true,
      product,
      message: 'Product updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
 
// Admin: Delete Product
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
 
    if (!product) {
      return next(new ErrorHandler('Product not found', 404));
    }
 
    // Delete images from cloudinary
    for (let i = 0; i < product.images.length; i++) {
      await cloudinary.uploader.destroy(product.images[i].public_id);
    }
 
    await product.deleteOne();
 
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
 
// Create/Update Review
exports.createProductReview = async (req, res, next) => {
  try {
    const { rating, comment, productId } = req.body;
 
    const review = {
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment,
    };
 
    const product = await Product.findById(productId);
 
    if (!product) {
      return next(new ErrorHandler('Product not found', 404));
    }
 
    // Check if user already reviewed
    const isReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );
 
    if (isReviewed) {
      product.reviews.forEach((review) => {
        if (review.user.toString() === req.user._id.toString()) {
          review.comment = comment;
          review.rating = rating;
        }
      });
    } else {
      product.reviews.push(review);
      product.numOfReviews = product.reviews.length;
    }
 
    // Calculate average rating
    let avg = 0;
    product.reviews.forEach((rev) => {
      avg += rev.rating;
    });
    product.ratings = avg / product.reviews.length;
 
    await product.save({ validateBeforeSave: false });
 
    res.status(200).json({
      success: true,
      message: 'Review added successfully',
    });
  } catch (error) {
    next(error);
  }
};
 
// Get Product Reviews
exports.getProductReviews = async (req, res, next) => {
  try {
    const product = await Product.findById(req.query.id);
 
    if (!product) {
      return next(new ErrorHandler('Product not found', 404));
    }
 
    res.status(200).json({
      success: true,
      reviews: product.reviews,
    });
  } catch (error) {
    next(error);
  }
};
 
// Delete Review
exports.deleteReview = async (req, res, next) => {
  try {
    const product = await Product.findById(req.query.productId);
 
    if (!product) {
      return next(new ErrorHandler('Product not found', 404));
    }
 
    const reviews = product.reviews.filter(
      (review) => review._id.toString() !== req.query.id.toString()
    );
 
    let avg = 0;
    reviews.forEach((rev) => {
      avg += rev.rating;
    });
 
    const numOfReviews = reviews.length;
    const ratings = numOfReviews === 0 ? 0 : avg / numOfReviews;
 
    await Product.findByIdAndUpdate(
      req.query.productId,
      { reviews, ratings, numOfReviews },
      { new: true, runValidators: true }
    );
 
    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
 
// ---------- Home page sections (Featured / Trending) ----------
const SECTION_LIMIT = 10;
 
// Flag wale products kam hon to baaki active products se SECTION_LIMIT tak bhar do (duplicate nahi)
const fillUp = async (flagged, sort) => {
  if (flagged.length >= SECTION_LIMIT) return flagged;
  const extra = await Product.find({
    isActive: true,
    ...(priceCondition() || {}),
    _id: { $nin: flagged.map((p) => p._id) },
  })
    .populate('category', 'name slug')
    .sort(sort)
    .limit(SECTION_LIMIT - flagged.length);
  return [...flagged, ...extra];
};
 
// Get Featured Products
exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const flagged = await Product.find({ isFeatured: true, isActive: true, ...(priceCondition() || {}) })
      .populate('category', 'name slug')
      .limit(SECTION_LIMIT);
    const products = await fillUp(flagged, { createdAt: -1 });
 
    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    next(error);
  }
};
 
// Get Trending Products
exports.getTrendingProducts = async (req, res, next) => {
  try {
    const flagged = await Product.find({ isTrending: true, isActive: true, ...(priceCondition() || {}) })
      .populate('category', 'name slug')
      .sort({ totalSold: -1 })
      .limit(SECTION_LIMIT);
    const products = await fillUp(flagged, { totalSold: -1 });
 
    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    next(error);
  }
};
 
// Get Flash Deal Products
exports.getFlashDeals = async (req, res, next) => {
  try {
    const products = await Product.find({
      isFlashDeal: true,
      isActive: true,
      ...(priceCondition() || {}),
      flashDealExpiry: { $gt: new Date() },
    }).populate('category', 'name slug');
 
    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    next(error);
  }
};
 
// Admin: Get All Products (including inactive)
exports.getAdminProducts = async (req, res, next) => {
  try {
    const products = await Product.find().populate('category', 'name').sort({
      createdAt: -1,
    });
 
    res.status(200).json({
      success: true,
      products,
      count: products.length,
    });
  } catch (error) {
    next(error);
  }
};
 