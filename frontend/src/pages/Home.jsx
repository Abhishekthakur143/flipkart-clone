import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchFeaturedProducts, fetchTrendingProducts, fetchFlashDeals } from '../redux/slices/productSlice';
import ProductCard from '../components/ProductCard';
import { BANNERS, CATEGORIES } from '../utils/constants';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';
import './home.css';

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
      {/* Hero Banner Slider */}
      <div className="hm-hero">
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
      <Section title="Shop By Category">
        <div className="hm-cats">
          {CATEGORIES.map((cat) => (
            <Link key={cat.slug} to={`/products?category=${cat.slug}`} className="hm-cat">
              <span className="hm-cat-ico">{cat.icon}</span>
              <span className="hm-cat-name">{cat.name}</span>
            </Link>
          ))}
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