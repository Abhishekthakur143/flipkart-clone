

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineHeart, HiHeart, HiStar } from 'react-icons/hi';
import { useSelector, useDispatch } from 'react-redux';
import { addToWishlist, removeFromWishlist } from '../redux/slices/wishlistSlice';
import { addToCart } from '../redux/slices/cartSlice';
import { formatPrice, getDiscount } from '../utils/constants';
import toast from 'react-hot-toast';
import './productcard.css';
import { optimizeImg } from '../utils/image';

const ProductCard = ({ product, index = 0 }) => {
  const dispatch = useDispatch();
  const { wishlistItems } = useSelector((state) => state.wishlist);
  const { isAuthenticated } = useSelector((state) => state.auth);

  const isInWishlist = wishlistItems?.some((item) => item._id === product._id);

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }
    if (product.stock <= 0) {
      toast.error('Product is out of stock');
      return;
    }
    dispatch(addToCart({
      product: product._id,
      name: product.name,
      price: product.price,
      cuttedPrice: product.cuttedPrice,
      image: product.images[0]?.url,
      stock: product.stock,
      quantity: 1,
    }));
    toast.success('Added to cart!');
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist');
      return;
    }
    if (isInWishlist) {
      dispatch(removeFromWishlist(product._id));
      toast.success('Removed from wishlist');
    } else {
      dispatch(addToWishlist(product._id));
      toast.success('Added to wishlist');
    }
  };

  const discount = getDiscount(product.cuttedPrice, product.price);
  const hasDiscount = product.cuttedPrice > product.price;

  return (
    <motion.div
      className="pc"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link to={`/product/${product._id}`} className="pc-link">
        {hasDiscount && <span className="pc-badge">{discount}% off</span>}

        {/* Wishlist Icon */}
        <button
          onClick={handleWishlist}
          className={`pc-wish ${isInWishlist ? 'on' : ''}`}
          aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {isInWishlist ? <HiHeart /> : <HiOutlineHeart />}
        </button>

        {/* Image Container */}
        <div className="pc-img">
          <img
            src={optimizeImg(product.images[0]?.url, 400) || FALLBACK_IMG}
            alt={product.name}
            loading="lazy"
           decoding="async"
         />
        </div>

        {/* Details Container */}
        <div className="pc-body">
          <h3 className="pc-name">{product.name}</h3>

          {/* Rating */}
          {product.ratings > 0 && (
            <div className="pc-rate">
              <span className="pc-rating">
                {product.ratings.toFixed(1)} <HiStar />
              </span>
              <span className="pc-rev">({product.numOfReviews})</span>
            </div>
          )}

          {/* Price */}
          <div className="pc-price-wrap">
            <div className="pc-prices">
              <span className="pc-price">{formatPrice(product.price)}</span>
              {hasDiscount && (
                <>
                  <span className="pc-old">{formatPrice(product.cuttedPrice)}</span>
                  <span className="pc-off">{discount}% off</span>
                </>
              )}
            </div>
            <p className="pc-ship">Free delivery</p>
          </div>

          {/* Add to Cart Button (Shows on Hover) */}
          <button onClick={handleAddToCart} className="pc-cart">ADD TO CART</button>
        </div>

        {/* Out of Stock Overlay */}
        {product.stock <= 0 && (
          <div className="pc-oos"><span>Out of Stock</span></div>
        )}
      </Link>
    </motion.div>
  );
};

export default ProductCard;