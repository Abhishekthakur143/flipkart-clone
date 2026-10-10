import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense } from 'react';
 
// Layouts
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';
import AdminLayout from './components/layouts/AdminLayout';
 
// Pages - Lazy loaded
const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/VerifyEmail'));
const Signup = lazy(() => import('./pages/Register'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetails = lazy(() => import('./pages/OrderDetails'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const OtpLogin = lazy(() => import('./pages/OtpLogin'));
const ForgotPasswordOtp = lazy(() => import('./pages/ForgotPasswordOtp'));
 
// Delivery partner app (separate login + dashboard)
const DeliveryAuth = lazy(() => import('./delivery/DeliveryAuth'));
const DeliveryDashboard = lazy(() => import('./delivery/DeliveryDashboard'));
 
// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminProductForm = lazy(() => import('./pages/admin/ProductForm'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));
const AdminCoupons = lazy(() => import('./pages/admin/Coupons'));
const AdminDeliveries = lazy(() => import('./pages/admin/Deliveries'));
const AdminDeliveryPartners = lazy(() => import('./pages/admin/DeliveryPartners'));
 
// Components
import Loading from './components/Loading';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
 
// Delivery wali alag site ke liye: Vercel mein VITE_APP_MODE=delivery set karo.
// Tab "/" khulte hi seedha /delivery par chala jayega.
const isDeliveryApp = import.meta.env.VITE_APP_MODE === 'delivery';
 
function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            fontSize: '14px',
          },
          success: {
            style: { background: '#388e3c' },
          },
          error: {
            style: { background: '#ff6161' },
          },
        }}
      />
      <ScrollToTop />
      <Suspense fallback={<Loading />}>
        <AnimatePresence mode="wait">
          <Routes>
            {/* Public Routes */}
            <Route element={<MainLayout />}>
              <Route
                path="/"
                element={isDeliveryApp ? <Navigate to="/delivery" replace /> : <Home />}
              />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/wishlist" element={<Wishlist />} />
            </Route>
 
            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Signup />} />
              <Route path="/verify-email" element={<Register />} />
              <Route path="/password/forgot" element={<ForgotPasswordOtp />} />
              <Route path="/password/reset/:token" element={<ResetPassword />} />
              <Route path="/login-otp" element={<OtpLogin />} />
              <Route path="/forgot-password-otp" element={<ForgotPasswordOtp />} />
            </Route>
 
            {/* Protected Routes (sirf logged-in users) */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/order/:id" element={<OrderDetails />} />
            </Route>
 
            {/* Delivery Partner Routes (own layout, own login) */}
            {/* Register nahi hai: partner sirf admin banata hai */}
            <Route path="/delivery/login" element={<DeliveryAuth mode="login" />} />
            <Route path="/delivery/register" element={<Navigate to="/delivery/login" replace />} />
            <Route path="/delivery" element={<DeliveryDashboard />} />
 
            {/* Admin Routes (sirf admin) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute isAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="product/new" element={<AdminProductForm />} />
              <Route path="product/:id" element={<AdminProductForm />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="deliveries" element={<AdminDeliveries />} />
              <Route path="delivery-partners" element={<AdminDeliveryPartners />} />
            </Route>
          </Routes>
        </AnimatePresence>
      </Suspense>
    </>
  );
}
 
export default App;
 