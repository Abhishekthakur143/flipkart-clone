import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../redux/slices/productSlice';
import ProductCard from '../components/ProductCard';
import CardSkeleton from '../components/SkeletonLoader';
import {
  HiOutlineAdjustments,
  HiOutlineX,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from 'react-icons/hi';
import './products.css';

const NO_LIMIT = 99999999; // max khaali chhodo to koi upar ki limit nahi

// Quick price buttons: [min, max, label]
const PRICE_PRESETS = [
  [0, 5000, 'Under ₹5,000'],
  [5000, 10000, '₹5,000 - ₹10,000'],
  [10000, 20000, '₹10,000 - ₹20,000'],
  [20000, null, '₹20,000 & above'],
];

// Rating filter: [minRating, label] -> 4 ke upar sab, baaki exact band (3 = 3 se 4 ke beech)
const RATING_OPTIONS = [
  [4, '4★ & above'],
  [3, '3★ to 4★'],
  [2, '2★ to 3★'],
  [1, '1★ to 2★'],
];

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { products, loading, productsCount, resultPerPage, filteredProductsCount } = useSelector((state) => state.products);
  const [showFilter, setShowFilter] = useState(false);

  const keyword = searchParams.get('keyword') || '';
  const category = searchParams.get('category') || '';
  const page = Number(searchParams.get('page')) || 1;

  // Price filter: input boxes ki value (string) aur API ko jaane wali applied range
  const [minInput, setMinInput] = useState('');
  const [maxInput, setMaxInput] = useState('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: NO_LIMIT });
  const [priceError, setPriceError] = useState('');
  const [ratings, setRatings] = useState(0);

  useEffect(() => {
    const params = {
      keyword,
      category,
      page,
      'price[gte]': priceRange.min,
      'price[lte]': priceRange.max,
      'ratings[gte]': ratings,
    };

    // 4 se neeche wale band me upar ki limit bhi lagao (3 chuno to 4 se zyada wale na dikhe)
    if (ratings > 0 && ratings < 4) {
      params['ratings[lte]'] = ratings + 0.99;
    }

    dispatch(fetchProducts(params));
  }, [dispatch, keyword, category, page, priceRange.min, priceRange.max, ratings]);

  const handlePageChange = (p) => {
    searchParams.set('page', p);
    setSearchParams(searchParams);
  };

  // Filter badalne pe page 1 pe wapas jao
  const resetPage = () => {
    if (searchParams.get('page')) {
      searchParams.delete('page');
      setSearchParams(searchParams);
    }
  };

  const applyPrice = (minVal = minInput, maxVal = maxInput) => {
    const min = minVal === '' ? 0 : Number(minVal);
    const max = maxVal === '' ? NO_LIMIT : Number(maxVal);

    if (Number.isNaN(min) || Number.isNaN(max) || min < 0 || max < 0) {
      setPriceError('Sahi price daalo');
      return;
    }
    if (min > max) {
      setPriceError('Minimum price, maximum se zyada nahi ho sakta');
      return;
    }

    setPriceError('');
    setPriceRange({ min, max });
    resetPage();
  };

  const applyPreset = (min, max) => {
    const minStr = String(min);
    const maxStr = max === null ? '' : String(max);
    setMinInput(minStr);
    setMaxInput(maxStr);
    applyPrice(minStr, maxStr);
  };

  const clearPrice = () => {
    setMinInput('');
    setMaxInput('');
    setPriceError('');
    setPriceRange({ min: 0, max: NO_LIMIT });
    resetPage();
  };

  const handlePriceKey = (e) => {
    if (e.key === 'Enter') applyPrice();
  };

  // Same rating pe dobara click karo to filter hat jayega
  const selectRating = (r) => {
    setRatings(ratings === r ? 0 : r);
    resetPage();
  };

  const priceActive = priceRange.min > 0 || priceRange.max < NO_LIMIT;
  const priceLabel =
    priceRange.max < NO_LIMIT
      ? `₹${priceRange.min.toLocaleString()} - ₹${priceRange.max.toLocaleString()}`
      : `₹${priceRange.min.toLocaleString()} & above`;
  const ratingLabel = RATING_OPTIONS.find(([r]) => r === ratings)?.[1];

  let totalPages = Math.ceil(filteredProductsCount / resultPerPage);

  return (
    <div className="pr">
      {/* Mobile Filter Toggle */}
      <button onClick={() => setShowFilter(!showFilter)} className="pr-fab" aria-label="Filters">
        <HiOutlineAdjustments />
      </button>

      {showFilter && <div className="pr-overlay" onClick={() => setShowFilter(false)} />}

      {/* Sidebar Filters */}
      <aside className={`pr-side ${showFilter ? 'open' : ''}`}>
        <div className="pr-side-head">
          <h2>Filters</h2>
          <button className="pr-x" onClick={() => setShowFilter(false)} aria-label="Close filters">
            <HiOutlineX />
          </button>
        </div>

        {/* Price Filter (Min - Max limit) */}
        <div className="pr-card">
          <div className="pr-card-head">
            <h3>Price</h3>
            {priceActive && (
              <button onClick={clearPrice} className="pr-clear">CLEAR</button>
            )}
          </div>

          <div className="pr-range">
            <input
              type="number"
              min="0"
              placeholder="Min"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              onKeyDown={handlePriceKey}
              className="pr-input"
            />
            <span>to</span>
            <input
              type="number"
              min="0"
              placeholder="Max"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              onKeyDown={handlePriceKey}
              className="pr-input"
            />
          </div>

          {priceError && <p className="pr-err">{priceError}</p>}

          <button onClick={() => applyPrice()} className="pr-apply">Apply</button>

          {/* Quick price buttons */}
          <div className="pr-presets">
            {PRICE_PRESETS.map(([min, max, label]) => (
              <button key={label} onClick={() => applyPreset(min, max)} className="pr-preset">
                {label}
              </button>
            ))}
          </div>

          {priceActive && <p className="pr-note">Showing products: {priceLabel}</p>}
        </div>

        {/* Ratings Filter */}
        <div className="pr-card">
          <div className="pr-card-head">
            <h3>Ratings</h3>
            {ratings > 0 && (
              <button onClick={() => selectRating(ratings)} className="pr-clear">CLEAR</button>
            )}
          </div>
          {RATING_OPTIONS.map(([r, label]) => (
            <button
              key={r}
              onClick={() => selectRating(r)}
              className={`pr-opt ${ratings === r ? 'on' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Categories Filter */}
        <div className="pr-card">
          <h3>Category</h3>
          {['Electronics', 'Fashion', 'Home', 'Mobiles'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSearchParams({ category: cat.toLowerCase() })}
              className={`pr-opt ${category === cat.toLowerCase() ? 'on' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </aside>

      {/* Product Grid */}
      <div className="pr-main">
        <div className="pr-head">
          <p className="pr-count">
            Showing <b>{products.length}</b> of <b>{filteredProductsCount}</b> results{' '}
            {keyword && `for "${keyword}"`}
          </p>
          {(priceActive || ratings > 0) && (
            <div className="pr-chips">
              {priceActive && (
                <button className="pr-chip" onClick={clearPrice}>
                  {priceLabel} <HiOutlineX />
                </button>
              )}
              {ratings > 0 && (
                <button className="pr-chip" onClick={() => selectRating(ratings)}>
                  {ratingLabel} <HiOutlineX />
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <CardSkeleton count={6} />
        ) : products.length === 0 ? (
          <div className="pr-empty">
            <div className="pr-empty-ico">🔍</div>
            <h2>No Products Found</h2>
            <p>Try changing the filters or search term.</p>
            {(priceActive || ratings > 0) && (
              <button
                className="pr-apply"
                onClick={() => {
                  clearPrice();
                  setRatings(0);
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="pr-grid">
              {products.map((product, i) => (
                <ProductCard key={product._id} product={product} index={i} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pr-pages">
                <button
                  className="pr-pg"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                  aria-label="Previous page"
                >
                  <HiOutlineChevronLeft />
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handlePageChange(i + 1)}
                    className={`pr-pg ${page === i + 1 ? 'on' : ''}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="pr-pg"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  aria-label="Next page"
                >
                  <HiOutlineChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Products;