export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
 
export const ORDER_STATUSES = {
  Processing: { color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
  Confirmed: { color: 'bg-blue-100 text-blue-800', icon: '✓' },
  Shipped: { color: 'bg-indigo-100 text-indigo-800', icon: '🚚' },
  'Out for Delivery': { color: 'bg-purple-100 text-purple-800', icon: '📦' },
  Delivered: { color: 'bg-green-100 text-green-800', icon: '✅' },
  Cancelled: { color: 'bg-red-100 text-red-800', icon: '❌' },
  Returned: { color: 'bg-gray-100 text-gray-800', icon: '↩️' },
};
 
export const CATEGORIES = [
  { name: 'Mobiles', icon: '📱', slug: 'mobiles' },
  { name: 'Laptops', icon: '💻', slug: 'laptops' },
  { name: 'Fashion', icon: '👕', slug: 'fashion' },
  { name: 'Electronics', icon: '🔌', slug: 'electronics' },
  { name: 'Home', icon: '🏠', slug: 'home' },
  { name: 'Appliances', icon: '📺', slug: 'appliances' },
  { name: 'Beauty', icon: '💄', slug: 'beauty' },
  { name: 'Grocery', icon: '🛒', slug: 'grocery' },
  { name: 'Toys', icon: '🧸', slug: 'toys' },
  { name: 'Books', icon: '📚', slug: 'books' },
  { name: 'TV', icon: '📺', slug: 'tv' },
  { name: 'Sports', icon: '⚽', slug: 'sports' },
  { name: 'Gaming', icon: '🎮', slug: 'gaming' },
  { name: 'Jewellery', icon: '💍', slug: 'jewellery' },
  { name: 'Auto', icon: '🚗', slug: 'auto' },
  { name: 'Health', icon: '💊', slug: 'health' },
  { name: 'Pets', icon: '🐾', slug: 'pets' },
  { name: 'Tools', icon: '🛠️', slug: 'tools' },
  { name: 'Garden', icon: '🌱', slug: 'garden' },
  { name: 'Music', icon: '🎵', slug: 'music' },
];
 
// Banner: crop nahi hota (puri image aati hai), width 1200px, compressed (q=75, auto=format)
// Local photo lagani ho to image: '/banners/naam.jpg' likho (frontend/public/banners/ mein rakho)
const BANNER_SIZE = 'w=1200&q=75&auto=format';
 
export const BANNERS = [
  {
    id: 1,
    image: `https://plus.unsplash.com/premium_photo-1664201890375-f8fa405cdb7d?${BANNER_SIZE}`,
    title: 'Mega Electronics Sale',
    subtitle: 'Up to 80% off on Electronics',
    link: '/products?category=electronics',
    bgColor: 'bg-blue-600',
  },
  {
    id: 2,
    image: `https://plus.unsplash.com/premium_photo-1683288706157-9913483dffc8?${BANNER_SIZE}`,
    title: 'Fashion Fiesta',
    subtitle: 'Trending Styles at Best Prices',
    link: '/products?category=fashion',
    bgColor: 'bg-purple-600',
  },
  {
    id: 3,
    image: `https://plus.unsplash.com/premium_photo-1683288662019-c92caea8276d?${BANNER_SIZE}`,
    title: 'Home Makeover',
    subtitle: 'Transform Your Space',
    link: '/products?category=home',
    bgColor: 'bg-green-600',
  },
  {
    id: 4,
    image: `https://plus.unsplash.com/premium_photo-1683141052679-942eb9e77760?${BANNER_SIZE}`,
    title: 'Smartphone Launch',
    subtitle: 'Latest smartphones at amazing prices',
    link: '/products?category=mobiles',
    bgColor: 'bg-orange-500',
  },
];
 
export const formatPrice = (price) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
};
 
export const getDiscount = (cuttedPrice, price) => {
  if (!cuttedPrice || cuttedPrice === 0) return 0;
  return Math.round(((cuttedPrice - price) / cuttedPrice) * 100);
};
 
export const truncateText = (text, maxLength = 60) => {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
};
 