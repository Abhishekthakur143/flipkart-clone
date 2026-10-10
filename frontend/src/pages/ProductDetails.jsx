import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductDetails, createReview } from '../redux/slices/productSlice';
import { addToCart } from '../redux/slices/cartSlice';
import { addToWishlist, removeFromWishlist } from '../redux/slices/wishlistSlice';
import ProductCard from '../components/ProductCard';
import { formatPrice, getDiscount } from '../utils/constants';
import {
  HiStar,
  HiOutlineHeart,
  HiHeart,
  HiShoppingCart,
  HiMinusSm,
  HiPlusSm,
  HiOutlineCheckCircle,
  HiOutlineTruck,
  HiOutlineShieldCheck,
  HiOutlineRefresh,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import './product-details.css';

const ProductDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { product, similarProducts, detailLoading } = useSelector((state) => state.products);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { wishlistItems } = useSelector((state) => state.wishlist);

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [rating, setRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    dispatch(fetchProductDetails(id));
    setQuantity(1);
    setSelectedImage(0);
  }, [dispatch, id]);

  const isInWishlist = wishlistItems?.some((item) => item._id === id);

  const handleAddToCart = () => {
    if (!isAuthenticated) return toast.error('Please login first');
    if (product.stock <= 0) return toast.error('Product is out of stock');
    dispatch(addToCart({
      product: product._id, name: product.name, price: product.price,
      cuttedPrice: product.cuttedPrice, image: product.images[0]?.url,
      stock: product.stock, quantity
    }));
    toast.success('Added to cart');
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!isAuthenticated) return toast.error('Please login to review');
    if (!rating) return toast.error('Please select a star rating');
    dispatch(createReview({ rating, comment, productId: product._id }));
    setRating(0); setComment('');
    toast.success('Review submitted');
  };

  // zoom image mouse ke saath move kare
  const handleZoomMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const img = e.currentTarget.querySelector('img');
    if (img) {
      img.style.transformOrigin = `${((e.clientX - box.left) / box.width) * 100}% ${((e.clientY - box.top) / box.height) * 100}%`;
    }
  };

  if (detailLoading || !product) {
    return (
      <div className="pd-loading">
        <div className="pd-spin" />
        Loading product...
      </div>
    );
  }

  const hasDiscount = product.cuttedPrice > product.price;
  const inStock = product.stock > 0;

  return (
    <div className="pd">
      <div className="pd-card">
        {/* Left: Images */}
        <div className="pd-gallery">
          <div className="pd-zoom" onMouseMove={handleZoomMove}>
            <img src={product.images[selectedImage]?.url} alt={product.name} />
          </div>
          <div className="pd-thumbs">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={`pd-thumb ${selectedImage === i ? 'on' : ''}`}
              >
                <img src={img.url} alt="" />
              </button>
            ))}
          </div>
          <div className="pd-btns">
            <button onClick={handleAddToCart} disabled={!inStock} className="pd-btn pd-cart">
              <HiShoppingCart /> ADD TO CART
            </button>
            <button
              onClick={() => { isInWishlist ? dispatch(removeFromWishlist(id)) : dispatch(addToWishlist(id)); }}
              className="pd-btn pd-wish"
            >
              {isInWishlist ? <HiHeart /> : <HiOutlineHeart />}
              {isInWishlist ? 'WISHLISTED' : 'WISHLIST'}
            </button>
          </div>
        </div>

        {/* Right: Details */}
        <div className="pd-info">
          <h1 className="pd-title">{product.name}</h1>
          <div className="pd-rate">
            <span className="pd-pill">
              {product.ratings.toFixed(1)} <HiStar />
            </span>
            <span className="pd-muted">({product.numOfReviews} Reviews)</span>
          </div>

          <div className="pd-price-box">
            <span className="pd-price">{formatPrice(product.price)}</span>
            {hasDiscount && (
              <>
                <span className="pd-old">{formatPrice(product.cuttedPrice)}</span>
                <span className="pd-off">{getDiscount(product.cuttedPrice, product.price)}% off</span>
              </>
            )}
          </div>

          <div className="pd-meta">
            <span className="pd-chip"><b>Brand:</b> {product.brand || 'N/A'}</span>
            <span className={`pd-chip ${inStock ? 'ok' : 'no'}`}>
              {inStock ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>

          {inStock && (
            <div className="pd-qty-row">
              <span>Quantity</span>
              <div className="pd-qty">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="Decrease quantity">
                  <HiMinusSm />
                </button>
                <span className="pd-qty-n">{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))} disabled={quantity >= product.stock} aria-label="Increase quantity">
                  <HiPlusSm />
                </button>
              </div>
            </div>
          )}

          <div className="pd-perks">
            <div className="pd-perk"><HiOutlineTruck /> Free delivery</div>
            <div className="pd-perk"><HiOutlineShieldCheck /> Secure payments</div>
            <div className="pd-perk"><HiOutlineRefresh /> Easy returns</div>
          </div>

          {product.highlights?.length > 0 && (
            <>
              <h3 className="pd-sec-title">Highlights</h3>
              <ul className="pd-list">
                {product.highlights.map((h, i) => (
                  <li key={i}><HiOutlineCheckCircle /> {h}</li>
                ))}
              </ul>
            </>
          )}

          <h3 className="pd-sec-title">Description</h3>
          <p className="pd-desc">{product.description}</p>

          {/* Reviews Section */}
          <div className="pd-reviews">
            <h3 className="pd-sec-title">Ratings &amp; Reviews</h3>

            <div className="pd-sum">
              <span className="pd-avg">{product.ratings.toFixed(1)}</span>
              <div>
                <div className="pd-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <HiStar key={s} className={s <= Math.round(product.ratings) ? 'on' : ''} />
                  ))}
                </div>
                <span className="pd-muted">{product.numOfReviews} reviews</span>
              </div>
            </div>

            {isAuthenticated && (
              <form onSubmit={handleReviewSubmit} className="pd-form">
                <div className="pd-form-stars" onMouseLeave={() => setHoverStar(0)}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <HiStar
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverStar(star)}
                      className={star <= (hoverStar || rating) ? 'on' : ''}
                    />
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="pd-textarea"
                  rows="3"
                  placeholder="Write a review..."
                  required
                ></textarea>
                <button type="submit" className="pd-submit">Submit Review</button>
              </form>
            )}

            <div>
              {product.reviews.length === 0 ? (
                <p className="pd-muted">No reviews yet.</p>
              ) : (
                product.reviews.map((rev, i) => (
                  <div key={i} className="pd-rev">
                    <span className="pd-rev-av">{rev.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                    <div>
                      <div className="pd-rev-top">
                        <span className="pd-rev-name">{rev.name}</span>
                        <span className="pd-pill">{rev.rating} <HiStar /></span>
                      </div>
                      <p>{rev.comment}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Similar Products */}
      {similarProducts.length > 0 && (
        <div className="pd-sim">
          <h2 className="pd-sim-title">Similar Products</h2>
          <div className="pd-grid">
            {similarProducts.map((p, i) => <ProductCard key={p._id} product={p} index={i} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;