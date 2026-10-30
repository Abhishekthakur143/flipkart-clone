import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineLockClosed, HiOutlineLogout, HiOutlineMenu, HiOutlineMoon, HiOutlineSun } from 'react-icons/hi';
import AdminSidebar from '../admin/AdminSidebar';
import AdminGate from '../admin/AdminGate';
import { Link } from 'react-router-dom';
import { HiOutlineShieldCheck } from 'react-icons/hi';
import StaffRoute from '../StaffRoute';
import { lockAdminPanel, removeAdminUnlock } from '../../utils/adminUnlock';
import { logout } from '../../redux/slices/authSlice';
import '../admin/admin.css';
 
const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
 
  // Dark mode (Navbar wali hi 'theme' setting use hoti hai)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);
 
  // Logout: login token ke saath admin unlock token bhi hata do
  const doLogout = () => {
    removeAdminUnlock();
    dispatch(logout());
    navigate('/login', { replace: true });
  };
 
  // Page badalne par mobile menu band ho jaye
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);
 
  // Esc dabane par menu band
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);
 
  return (
    <StaffRoute roles={['admin', 'superadmin']}>
      <AdminGate>
        <div className="adm-shell">
          <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
          <div className="adm-main">
            <header className="adm-topbar">
              <button className="adm-top-btn adm-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
                <HiOutlineMenu />
              </button>
              <span className="adm-top-title">Admin Panel</span>
              {user?.role === 'superadmin' && (
                <Link to="/superadmin" className="adm-btn sm ghost" style={{ marginLeft: 12 }}><HiOutlineShieldCheck /> Super admin</Link>
              )}
              <div className="adm-top-right">
                <button className="adm-top-btn" onClick={lockAdminPanel} aria-label="Lock admin panel" title="Lock admin panel">
                  <HiOutlineLockClosed />
                </button>
                <button className="adm-top-btn" onClick={() => setIsDark((d) => !d)} aria-label="Toggle dark mode">
                  {isDark ? <HiOutlineSun /> : <HiOutlineMoon />}
                </button>
                <div className="adm-top-user">
                  <span className="adm-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'A'}</span>
                  <b>{user?.name}</b>
                </div>
                <button className="adm-top-btn" onClick={doLogout} aria-label="Logout" title="Logout">
                  <HiOutlineLogout />
                </button>
              </div>
            </header>
            <div className="adm-content">
              <Outlet />
            </div>
          </div>
        </div>
      </AdminGate>
    </StaffRoute>
  );
};
 
export default AdminLayout;
 