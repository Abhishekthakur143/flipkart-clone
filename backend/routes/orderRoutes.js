const express = require('express');
const {
  newOrder,
  getSingleOrder,
  myOrders,
  getAllOrders,
  updateOrder,
  deleteOrder,
} = require('../controllers/orderController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/new', isAuthenticated, newOrder);
router.get('/me', isAuthenticated, myOrders);
router.get('/:id', isAuthenticated, getSingleOrder);

// Admin routes
router.get('/admin/all', isAuthenticated, isAdmin, getAllOrders);
router.put('/admin/:id', isAuthenticated, isAdmin, updateOrder);
router.delete('/admin/:id', isAuthenticated, isAdmin, deleteOrder);

module.exports = router;