const express = require('express');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require('../controllers/wishlistController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.get('/', isAuthenticated, getWishlist);
router.post('/:id', isAuthenticated, addToWishlist);
router.delete('/:id', isAuthenticated, removeFromWishlist);

module.exports = router;