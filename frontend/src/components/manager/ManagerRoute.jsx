import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AdminGate from '../admin/AdminGate';

// Manager andar aa sakta hai. Superadmin bhi (security gate ke baad).
const ManagerRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'superadmin') return <AdminGate>{children}</AdminGate>;
  if (user?.role !== 'manager') return <Navigate to="/" replace />;
  return children;
};

export default ManagerRoute;
