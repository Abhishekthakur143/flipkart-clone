import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Sirf diye gaye roles andar aa sakte hain. Login nahi to /login, galat role to home.
const StaffRoute = ({ roles, children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
};

export default StaffRoute;
