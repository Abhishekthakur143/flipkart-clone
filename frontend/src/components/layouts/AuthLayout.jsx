import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import '../auth-extra.css';

const AuthLayout = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="auth-layout">
      <Outlet />
    </div>
  );
};

export default AuthLayout;