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
const DeliveryJoin = lazy(() => import('./delivery/DeliveryJoin'));
 
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
const AdminManagers = lazy(() => import('./pages/admin/Managers'));
const AdminApprovals = lazy(() => import('./pages/admin/Approvals'));

// Manager panel (admin banata hai, sirf role 'manager')
const ManagerLayout = lazy(() => import('./components/layouts/ManagerLayout'));
const ManagerDashboard = lazy(() => import('./pages/manager/Dashboard'));
const ManagerOrders = lazy(() => import('./pages/manager/Orders'));
const ManagerPartnerRequests = lazy(() => import('./pages/manager/PartnerRequests'));
// Super admin panel (sirf role 'superadmin')
const SuperAdminLayout = lazy(() => import('./components/layouts/SuperAdminLayout'));
const SuperOverview = lazy(() => import('./pages/superadmin/Overview'));
const SuperAccounts = lazy(() => import('./pages/superadmin/Accounts'));
const SuperSellers = lazy(() => import('./pages/superadmin/Sellers'));
const SuperActivity = lazy(() => import('./pages/superadmin/Activity'));
const SuperDeliveryPartners = lazy(() => import('./pages/superadmin/DeliveryPartners'));
const ManagerSellers = lazy(() => import('./pages/manager/Sellers'));
const ManagerDeals = lazy(() => import('./pages/manager/Deals'));

// Seller panel (manager access deta hai, sirf role 'seller')
const SellerLayout = lazy(() => import('./components/layouts/SellerLayout'));
const SellerDashboard = lazy(() => import('./pages/seller/Dashboard'));
const SellerVerification = lazy(() => import('./pages/seller/Verification'));
const SellerDeals = lazy(() => import('./pages/seller/Deals'));
const BecomeSeller = lazy(() => import('./pages/seller/BecomeSeller'));
const SellerSetupPassword = lazy(() => import('./pages/seller/SetupPassword'));
 
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
      background: 'rgba(20,26,46,0.78)',
      color: '#fff',
      fontSize: '14px',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: '999px',
      padding: '10px 18px',
    },
    success: { style: { background: 'rgba(34,139,60,0.82)' } },
    error: { style: { background: 'rgba(220,60,60,0.82)' } },
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
            <Route path="/delivery/join" element={<DeliveryJoin />} />
            <Route path="/delivery/register" element={<Navigate to="/delivery/login" replace />} />
            <Route path="/delivery" element={<DeliveryDashboard />} />
 
            {/* Admin Routes (admin + superadmin, role check AdminLayout ke andar hai) */}
            <Route path="/admin" element={<AdminLayout />}>
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
              <Route path="managers" element={<AdminManagers />} />
              <Route path="approvals" element={<AdminApprovals />} />
            </Route>

            {/* Manager Routes (sirf manager) */}
            <Route path="/manager" element={<ManagerLayout />}>
              <Route index element={<ManagerDashboard />} />
              <Route path="orders" element={<ManagerOrders />} />
              <Route path="partner-requests" element={<ManagerPartnerRequests />} />
              <Route path="sellers" element={<ManagerSellers />} />
              <Route path="deals" element={<ManagerDeals />} />
            </Route>

            {/* Super admin (sirf superadmin + security gate) */}
            <Route path="/superadmin" element={<SuperAdminLayout />}>
              <Route index element={<SuperOverview />} />
              <Route path="accounts" element={<SuperAccounts />} />
              <Route path="sellers" element={<SuperSellers />} />
              <Route path="activity" element={<SuperActivity />} />
              <Route path="delivery-partners" element={<SuperDeliveryPartners />} />
            </Route>

            {/* Seller: password set link (public) + panel (sirf seller) */}
            <Route path="/become-seller" element={<BecomeSeller />} />
            <Route path="/seller/setup/:token" element={<SellerSetupPassword />} />
            <Route path="/seller" element={<SellerLayout />}>
              <Route index element={<SellerDashboard />} />
              <Route path="verification" element={<SellerVerification />} />
              <Route path="deals" element={<SellerDeals />} />
            </Route>
          </Routes>
        </AnimatePresence>
      </Suspense>
    </>
  );
}
 
export default App;
 