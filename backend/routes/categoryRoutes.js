const express = require('express');
const {
  getAllCategories,
  getCategoryDetails,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', getAllCategories);
router.get('/:id', getCategoryDetails);

// Admin routes
router.post('/admin/new', isAuthenticated, isAdmin, createCategory);
router.put('/admin/:id', isAuthenticated, isAdmin, updateCategory);
router.delete('/admin/:id', isAuthenticated, isAdmin, deleteCategory);

module.exports = router;