import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  HiOutlineHome, HiOutlineShieldCheck, HiOutlineCollection, HiOutlineLogout, HiOutlineMenu,
  HiOutlineMoon, HiOutlineSun, HiOutlineX, HiOutlineArrowLeft,
} from 'react-icons/hi';
import { logout } from '../../redux/slices/authSlice';
import API from '../../utils/api';
import SellerRoute from '../seller/SellerRoute';
import '../admin/admin.css';
import '../deals/deals.css';
import '../../pages/manager/manager.css';

const SellerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [waiting, setWaiting] = useState(0); // manager ke jawab jinka seller ko reply dena hai

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const reload = useCallback(async () => {
    try {
      const { data } = await API.get('/seller/me');
      setProfile(data.profile);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load your seller account');
    }
    try {
      const { data } = await API.get('/deals/seller/count');
      setWaiting(data.waiting || 0);
    } catch { /* purani value rehne do */ }
  }, []);
  useEffect(() => { reload(); }, [reload, location.pathname]);

  const doLogout = () => { dispatch(logout()); navigate('/login', { replace: true }); };
  const status = profile?.status;

  const MENU = [
    { name: 'Dashboard', path: '/seller', icon: HiOutlineHome, end: true },
    { name: 'Verification', path: '/seller/verification', icon: HiOutlineShieldCheck, dot: status && status !== 'Verified' },
    { name: 'My items & deals', path: '/seller/deals', icon: HiOutlineCollection, badge: waiting },
  ];

  return (
    <SellerRoute>
      <div className="adm-shell">
        {menuOpen && <div className="adm-side-overlay" onClick={() => setMenuOpen(false)} />}
        <aside className={`adm-side ${menuOpen ? 'open' : ''}`}>
          <Link to="/seller" className="adm-brand">
            <span className="adm-brand-mark">★</span>
            <span><b>Seller Panel</b><small>Flipkart Clone</small></span>
            <button type="button" className="adm-side-close" aria-label="Close menu" onClick={(e) => { e.preventDefault(); setMenuOpen(false); }}><HiOutlineX /></button>
          </Link>
          <nav className="adm-nav">
            <div className="adm-nav-label">YOUR SHOP</div>
            {MENU.map((m) => (
              <NavLink key={m.path} to={m.path} end={m.end} className={({ isActive }) => `adm-link ${isActive ? 'on' : ''}`}>
                <m.icon /> {m.name}
                {m.badge > 0 && <span className="mg-badge-btn">{m.badge}</span>}
                {m.dot && <span className="mg-badge-btn" title="Action needed">!</span>}
              </NavLink>
            ))}
          </nav>
          <div className="adm-side-foot">
            <Link to="/" className="adm-link"><HiOutlineArrowLeft /> Back to store</Link>
            <button type="button" className="adm-link" style={{ width: '100%', background: 'none', border: 0, cursor: 'pointer' }} onClick={doLogout}><HiOutlineLogout /> Logout</button>
          </div>
        </aside>
        <div className="adm-main">
          <header className="adm-topbar">
            <button className="adm-top-btn adm-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu"><HiOutlineMenu /></button>
            <span className="adm-top-title">Seller Panel</span>
            <div className="adm-top-right">
              <button className="adm-top-btn" onClick={() => setIsDark((d) => !d)} aria-label="Toggle dark mode">{isDark ? <HiOutlineSun /> : <HiOutlineMoon />}</button>
              <div className="adm-top-user"><span className="adm-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'S'}</span><b>{user?.name}</b></div>
            </div>
          </header>
          <div className="adm-content">
            {error && !profile ? (
              <div className="adm-card adm-pad"><h2 className="adm-card-title">Seller account load nahi hua</h2><p className="adm-sub" style={{ marginBottom: 14 }}>{error}</p><button className="adm-btn" onClick={reload}>Try again</button></div>
            ) : !profile ? (
              <div className="adm-spin-wrap"><div className="adm-spin" /></div>
            ) : (
              <Outlet context={{ profile, reload }} />
            )}
          </div>
        </div>
      </div>
    </SellerRoute>
  );
};

export default SellerLayout;
