import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineSearch,
  HiOutlineShoppingCart,
  HiOutlineHeart,
  HiOutlineUser,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineClipboardList,
  HiOutlineLogout,
  HiOutlineCog,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineViewGrid,
} from 'react-icons/hi';
import { logout } from '../redux/slices/authSlice';
import { selectCartItemCount } from '../redux/slices/cartSlice';
import PanelLink from './PanelLink';
import './navbar.css';
 
const CATEGORIES = [
  { name: 'Electronics', slug: 'electronics', icon: '🔌' },
  { name: 'Mobiles', slug: 'mobiles', icon: '📱' },
  { name: 'Laptops', slug: 'laptops', icon: '💻' },
  { name: 'Fashion', slug: 'fashion', icon: '👕' },
  { name: 'Home & Furniture', slug: 'home', icon: '🏠' },
  { name: 'Appliances', slug: 'appliances', icon: '📺' },
  { name: 'Beauty', slug: 'beauty', icon: '💄' },
  { name: 'Grocery', slug: 'grocery', icon: '🛒' },
  { name: 'Toys', slug: 'toys', icon: '🧸' },
  { name: 'Books', slug: 'books', icon: '📚' },
];
 
const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const profileRef = useRef(null);
 
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const cartItemCount = useSelector(selectCartItemCount);
  const { wishlistItems } = useSelector((state) => state.wishlist);
 
  const activeCat = new URLSearchParams(location.search).get('category');
 
  useEffect(() => {
    let lastY = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 20);
      // neeche scroll -> navbar chhup jaye, upar scroll -> wapas aa jaye
      if (y > lastY && y > 90) setIsHidden(true);
      else if (y < lastY) setIsHidden(false);
      lastY = y;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
 
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
 
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?keyword=${searchQuery.trim()}`);
      setSearchQuery('');
    }
  };
 
  const handleLogout = () => {
    dispatch(logout());
    setIsProfileOpen(false);
    navigate('/');
  };
 
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);
 
  const toggleDarkMode = () => setIsDark((d) => !d);
 
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U';
 
  // menu ya profile khula ho to navbar chhupta nahi
  const hideNav = isHidden && !isMenuOpen && !isProfileOpen;
 
  return (
    <header className={`nb ${isScrolled ? 'scrolled' : ''} ${hideNav ? 'nb-hide' : ''}`}>
      {/* Top Navbar */}
      <div className="nb-wrap">
        <div className="nb-row">
          {/* Logo */}
          <Link to="/" className="nb-logo">
            <span className="nb-logo-mark">★</span>
            <span className="nb-logo-text">
              <span className="nb-logo-name">Flipkart</span>
              <span className="nb-logo-sub">
                Explore <b>Plus</b>
              </span>
            </span>
          </Link>
 
          {/* Search Bar (desktop) */}
          <div className="nb-search">
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search for Products, Brands and More"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="nb-input"
              />
              <button type="submit" className="nb-sbtn" aria-label="Search">
                <HiOutlineSearch />
              </button>
            </form>
          </div>
 
          {/* Action Buttons */}
          <div className="nb-actions">
            {/* Mobile Search Toggle */}
            <button className="nb-icon nb-sm" onClick={() => navigate('/search')} aria-label="Search">
              <HiOutlineSearch />
            </button>
 
            {/* Dark Mode Toggle */}
            <button onClick={toggleDarkMode} className="nb-icon" aria-label="Toggle dark mode">
              {isDark ? <HiOutlineSun /> : <HiOutlineMoon />}
            </button>
 
            {/* Profile / Login */}
            <div className="nb-profile" ref={profileRef}>
              {isAuthenticated ? (
                <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="nb-icon">
                  <span className="nb-avatar">{initial}</span>
                  <span className="nb-label">{user?.name?.split(' ')[0]}</span>
                </button>
              ) : (
                <Link to="/login" className="nb-login">Login</Link>
              )}
 
              {/* Profile Dropdown */}
              <AnimatePresence>
                {isProfileOpen && isAuthenticated && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    className="nb-dd"
                  >
                    <div className="nb-dd-head">
                      <span className="nb-avatar">{initial}</span>
                      <div>
                        <p className="nb-dd-name">{user?.name}</p>
                        <p className="nb-dd-mail">{user?.email}</p>
                      </div>
                    </div>
                    <Link to="/profile" onClick={() => setIsProfileOpen(false)} className="nb-dd-item">
                      <HiOutlineUser /> My Profile
                    </Link>
                    <Link to="/orders" onClick={() => setIsProfileOpen(false)} className="nb-dd-item">
                      <HiOutlineClipboardList /> Orders
                    </Link>
                    <Link to="/wishlist" onClick={() => setIsProfileOpen(false)} className="nb-dd-item">
                      <HiOutlineHeart /> Wishlist
                    </Link>
                    {/* Admin / Manager / Super Admin / Seller ko unka panel (Settings ke upar) */}
                    <PanelLink onClick={() => setIsProfileOpen(false)} className="nb-dd-item admin">
                      <HiOutlineViewGrid />
                    </PanelLink>
                    <Link to="/profile" onClick={() => setIsProfileOpen(false)} className="nb-dd-item">
                      <HiOutlineCog /> Settings
                    </Link>
                    <div className="nb-dd-sep" />
                    <button onClick={handleLogout} className="nb-dd-item danger">
                      <HiOutlineLogout /> Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
 
            {/* Wishlist */}
            <Link to="/wishlist" className="nb-icon nb-md" aria-label="Wishlist">
              <HiOutlineHeart />
              {wishlistItems?.length > 0 && <span className="nb-badge">{wishlistItems.length}</span>}
            </Link>
 
            {/* Cart */}
            <Link to="/cart" className="nb-icon" aria-label="Cart">
              <HiOutlineShoppingCart />
              {cartItemCount > 0 && <span className="nb-badge">{cartItemCount}</span>}
              <span className="nb-label">Cart</span>
            </Link>
 
            {/* Mobile Menu Toggle */}
            <button className="nb-icon nb-sm" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Menu">
              {isMenuOpen ? <HiOutlineX /> : <HiOutlineMenu />}
            </button>
          </div>
        </div>
      </div>
 
      {/* Mobile Search Bar */}
      <div className="nb-msearch">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search for Products"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="nb-input"
          />
          <button type="submit" className="nb-sbtn" aria-label="Search">
            <HiOutlineSearch />
          </button>
        </form>
      </div>
 
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="nb-mmenu"
          >
            <div style={{ padding: '6px 0' }}>
              {isAuthenticated ? (
                <>
                  <PanelLink onClick={() => setIsMenuOpen(false)} />
                  <Link to="/profile" onClick={() => setIsMenuOpen(false)}>My Profile</Link>
                  <Link to="/orders" onClick={() => setIsMenuOpen(false)}>My Orders</Link>
                  <Link to="/wishlist" onClick={() => setIsMenuOpen(false)}>Wishlist</Link>
                  <button
                    className="danger"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link to="/login" className="primary" onClick={() => setIsMenuOpen(false)}>
                  Login / Register
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* Category Strip */}
      <div className="nb-strip">
        <div className="nb-wrap">
          <div className="nb-strip-in">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/products?category=${cat.slug}`}
                className={`nb-cat ${activeCat === cat.slug ? 'active' : ''}`}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
 
export default Navbar;
 