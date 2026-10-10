const Category = require('../models/Category');
const ErrorHandler = require('../utils/errorHandler');
const cloudinary = require('../config/cloudinary');

// Get All Categories
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      sortOrder: 1,
    });

    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Category
exports.getCategoryDetails = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      $or: [{ _id: req.params.id }, { slug: req.params.id }],
    });

    if (!category) {
      return next(new ErrorHandler('Category not found', 404));
    }

    const Product = require('../models/Product');
    const products = await Product.find({
      category: category._id,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      category,
      products,
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Create Category
exports.createCategory = async (req, res, next) => {
  try {
    if (req.body.image) {
      const result = await cloudinary.uploader.upload(req.body.image, {
        folder: 'categories',
        width: 200,
        crop: 'scale',
      });

      req.body.image = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    }

    const category = await Category.create(req.body);

    res.status(201).json({
      success: true,
      category,
      message: 'Category created successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update Category
exports.updateCategory = async (req, res, next) => {
  try {
    let category = await Category.findById(req.params.id);

    if (!category) {
      return next(new ErrorHandler('Category not found', 404));
    }

    if (req.body.image) {
      if (category.image.public_id) {
        await cloudinary.uploader.destroy(category.image.public_id);
      }

      const result = await cloudinary.uploader.upload(req.body.image, {
        folder: 'categories',
        width: 200,
        crop: 'scale',
      });

      req.body.image = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    }

    category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      category,
      message: 'Category updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Delete Category
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return next(new ErrorHandler('Category not found', 404));
    }

    if (category.image.public_id) {
      await cloudinary.uploader.destroy(category.image.public_id);
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};