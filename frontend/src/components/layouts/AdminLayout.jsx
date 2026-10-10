import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HiOutlineMenu, HiOutlineMoon, HiOutlineSun } from 'react-icons/hi';
import AdminSidebar from '../admin/AdminSidebar';
import ProtectedRoute from '../ProtectedRoute';
import '../admin/admin.css';

const AdminLayout = () => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  // Dark mode (Navbar wali hi 'theme' setting use hoti hai)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

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
    <ProtectedRoute isAdmin={true}>
      <div className="adm-shell">
        <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="adm-main">
          <header className="adm-topbar">
            <button className="adm-top-btn adm-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <HiOutlineMenu />
            </button>
            <span className="adm-top-title">Admin Panel</span>
            <div className="adm-top-right">
              <button className="adm-top-btn" onClick={() => setIsDark((d) => !d)} aria-label="Toggle dark mode">
                {isDark ? <HiOutlineSun /> : <HiOutlineMoon />}
              </button>
              <div className="adm-top-user">
                <span className="adm-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'A'}</span>
                <b>{user?.name}</b>
              </div>
            </div>
          </header>
          <div className="adm-content">
            <Outlet />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminLayout;