import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchFeaturedProducts, fetchTrendingProducts, fetchFlashDeals } from '../redux/slices/productSlice';
import ProductCard from '../components/ProductCard';
import { BANNERS, CATEGORIES } from '../utils/constants';
import {
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineTruck,
  HiOutlineShieldCheck,
  HiOutlineRefresh,
} from 'react-icons/hi';
import {
  MdSmartphone,
  MdLaptopMac,
  MdCheckroom,
  MdHeadphones,
  MdChair,
  MdKitchen,
  MdFace,
  MdShoppingBasket,
  MdToys,
  MdMenuBook,
  MdTv,
  MdCategory,
} from 'react-icons/md';
import './home.css';
import './home-extra.css';
 
// Category slug -> logo + tile colours. Unknown slug falls back to the generic icon.
const CAT_LOGOS = {
  mobiles: { Icon: MdSmartphone, from: '#6d8bff', to: '#3d5af1' },
  laptops: { Icon: MdLaptopMac, from: '#8b7bff', to: '#5b45e8' },
  fashion: { Icon: MdCheckroom, from: '#ff8fb1', to: '#e8457a' },
  electronics: { Icon: MdHeadphones, from: '#4fd1c5', to: '#13978a' },
  home: { Icon: MdChair, from: '#ffb86b', to: '#f0791f' },
  appliances: { Icon: MdKitchen, from: '#6ec6ff', to: '#2487d8' },
  beauty: { Icon: MdFace, from: '#ff9ad5', to: '#d6439b' },
  grocery: { Icon: MdShoppingBasket, from: '#7ddf8a', to: '#2fa24a' },
  toys: { Icon: MdToys, from: '#ffd36b', to: '#f0a000' },
  books: { Icon: MdMenuBook, from: '#c3a2ff', to: '#8250e0' },
  tv: { Icon: MdTv, from: '#7fb0ff', to: '#3a6fe0' },
};
const FALLBACK_LOGO = { Icon: MdCategory, from: '#a5b0c8', to: '#6a7691' };
 
const Section = ({ title, to, tone = '', children }) => (
  <motion.section
    className={`hm-sec ${tone}`}
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.45 }}
  >
    <div className="hm-head">
      <h2 className="hm-title">{title}</h2>
      {to && (
        <Link to={to} className="hm-all">
          View All <HiOutlineChevronRight />
        </Link>
      )}
    </div>
    {children}
  </motion.section>
);
 
const Home = () => {
  const dispatch = useDispatch();
  const { featuredProducts, trendingProducts, flashDeals } = useSelector((state) => state.products);
  const [currentBanner, setCurrentBanner] = useState(0);
 
  useEffect(() => {
    dispatch(fetchFeaturedProducts());
    dispatch(fetchTrendingProducts());
    dispatch(fetchFlashDeals());
  }, [dispatch]);
 
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % BANNERS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);
 
  const nextBanner = () => setCurrentBanner((prev) => (prev + 1) % BANNERS.length);
  const prevBanner = () => setCurrentBanner((prev) => (prev - 1 + BANNERS.length) % BANNERS.length);
 
  return (
    <div className="hm">
      {/* Hero: aadhi screen ka bada banner + upar likhi line */}
      <div className="hm-hero hm-hero-xl">
        <motion.div
          animate={{ x: `-${currentBanner * 100}%` }}
          transition={{ type: 'tween', duration: 0.5 }}
          className="hm-track"
        >
          {BANNERS.map((banner) => (
            <Link key={banner.id} to={banner.link} className="hm-slide">
              <img src={banner.image} alt={banner.title} />
            </Link>
          ))}
        </motion.div>
 
        <motion.div
          className="hm-cap"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h1 className="hm-cap-title">
            Shop online.
            <br />
            Pay less. Get it fast.
          </h1>
          <p className="hm-cap-text">Millions of products at honest prices, delivered right to your door.</p>
          <div className="hm-cap-actions">
            <Link to="/products" className="hm-cap-btn">
              Start shopping
            </Link>
            <Link to="/products?deal=flash" className="hm-cap-btn2">
              Today&apos;s deals
            </Link>
          </div>
        </motion.div>
 
        <div className="hm-trust">
          <div className="hm-trust-i">
            <HiOutlineTruck />
            <span>
              Fast delivery
              <small>To your doorstep</small>
            </span>
          </div>
          <div className="hm-trust-i">
            <HiOutlineShieldCheck />
            <span>
              Secure payments
              <small>100% protected</small>
            </span>
          </div>
          <div className="hm-trust-i">
            <HiOutlineRefresh />
            <span>
              Easy returns
              <small>Hassle free</small>
            </span>
          </div>
        </div>
 
        <button onClick={prevBanner} className="hm-arrow hm-prev" aria-label="Previous banner">
          <HiOutlineChevronLeft />
        </button>
        <button onClick={nextBanner} className="hm-arrow hm-next" aria-label="Next banner">
          <HiOutlineChevronRight />
        </button>
        <div className="hm-dots">
          {BANNERS.map((b, i) => (
            <button
              key={b.id}
              className={`hm-dot ${i === currentBanner ? 'on' : ''}`}
              onClick={() => setCurrentBanner(i)}
              aria-label={`Go to banner ${i + 1}`}
            />
          ))}
        </div>
      </div>
 
      {/* Categories Section */}
      <Section title="Shop By Category" tone="cats">
        <div className="hm-cats">
          {CATEGORIES.map((cat) => {
            const { Icon, from, to } = CAT_LOGOS[cat.slug] || FALLBACK_LOGO;
            return (
              <Link
                key={cat.slug}
                to={`/products?category=${cat.slug}`}
                className="hm-cat"
                style={{ '--c1': from, '--c2': to }}
              >
                <span className="hm-cat-logo">
                  <Icon />
                </span>
                <span className="hm-cat-row">
                  <span className="hm-cat-name">{cat.name}</span>
                  <span className="hm-cat-go" aria-hidden="true">
                    <HiOutlineChevronRight />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </Section>
 
      {/* Flash Deals */}
      {flashDeals.length > 0 && (
        <Section title="🔥 Flash Deals" to="/products?deal=flash" tone="flash">
          <div className="hm-grid c6">
            {flashDeals.slice(0, 6).map((product, i) => (
              <ProductCard key={product._id} product={product} index={i} />
            ))}
          </div>
        </Section>
      )}
 
      {/* Trending Products */}
      <Section title="Trending Now" to="/products?sort=-totalSold">
        <div className="hm-grid c5">
          {trendingProducts.slice(0, 5).map((product, i) => (
            <ProductCard key={product._id} product={product} index={i} />
          ))}
        </div>
      </Section>
 
      {/* Featured Products */}
      <Section title="Featured Products" to="/products">
        <div className="hm-grid c4">
          {featuredProducts.map((product, i) => (
            <ProductCard key={product._id} product={product} index={i} />
          ))}
        </div>
      </Section>
    </div>
  );
};
 
export default Home;
 