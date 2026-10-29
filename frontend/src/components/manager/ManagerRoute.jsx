import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Sirf role "manager" andar aa sakta hai
const ManagerRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'manager') return <Navigate to="/" replace />;
  return children;
};

export default ManagerRoute;
