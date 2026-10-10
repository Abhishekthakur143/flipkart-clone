import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWishlist } from '../redux/slices/wishlistSlice';
import ProductCard from '../components/ProductCard';
import { Link } from 'react-router-dom';
import { HiOutlineHeart } from 'react-icons/hi';
import './wishlist.css';

const Wishlist = () => {
  const dispatch = useDispatch();
  // ✅ DEFAULT VALUE [] SET KAR DI HAI TAAKI CRASH NA HO
  const { wishlistItems = [], loading, error } = useSelector((state) => state.wishlist);
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchWishlist());
    }
  }, [dispatch, isAuthenticated]);

  // Agar user login nahi hai
  if (!isAuthenticated) {
    return (
      <div className="wl">
        <div className="wl-card">
          <div className="wl-state">
            <div className="wl-state-ico"><HiOutlineHeart /></div>
            <h2>Please Login</h2>
            <p>You need to be logged in to view your wishlist.</p>
            <Link to="/login" className="wl-btn">Login Now</Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="wl-loading">
        <div className="wl-spin" />
        Loading Wishlist...
      </div>
    );
  }

  // Error state
  if (error) {
    return <div className="wl-error">{error}</div>;
  }

  return (
    <div className="wl">
      <div className="wl-card">
        <h1 className="wl-title">
          <span className="wl-title-ico"><HiOutlineHeart /></span>
          My Wishlist <span className="wl-count">{wishlistItems.length}</span>
        </h1>

        {wishlistItems.length === 0 ? (
          <div className="wl-state">
            <div className="wl-state-ico"><HiOutlineHeart /></div>
            <h2>Your wishlist is empty!</h2>
            <p>Add items to your wishlist by clicking the heart icon on products.</p>
            <Link to="/products" className="wl-btn">Explore Products</Link>
          </div>
        ) : (
          <div className="wl-grid">
            {wishlistItems.map((product, i) => (
              product ? <ProductCard key={product._id} product={product} index={i} /> : null
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;