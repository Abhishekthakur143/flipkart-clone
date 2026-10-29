import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Sirf role "seller" andar aa sakta hai
const SellerRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'seller') return <Navigate to="/" replace />;
  return children;
};

export default SellerRoute;
