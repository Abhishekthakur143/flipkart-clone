const express = require('express');
const {
  getAllProducts,
  getProductDetails,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  getProductReviews,
  deleteReview,
  getFeaturedProducts,
  getTrendingProducts,
  getFlashDeals,
  getAdminProducts,
} = require('../controllers/productController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getAllProducts);
router.get('/featured', getFeaturedProducts);
router.get('/trending', getTrendingProducts);
router.get('/flash-deals', getFlashDeals);
router.get('/:id', getProductDetails);
router.get('/reviews', getProductReviews);

// Protected routes
router.put('/review', isAuthenticated, createProductReview);
router.delete('/reviews', isAuthenticated, deleteReview);

// Admin routes
router.get('/admin/all', isAuthenticated, isAdmin, getAdminProducts);
router.post('/admin/new', isAuthenticated, isAdmin, createProduct);
router.put('/admin/:id', isAuthenticated, isAdmin, updateProduct);
router.delete('/admin/:id', isAuthenticated, isAdmin, deleteProduct);

module.exports = router;