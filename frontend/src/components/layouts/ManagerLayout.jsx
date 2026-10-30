import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  HiOutlineHome, HiOutlineClipboardList, HiOutlineUserAdd, HiOutlineLogout, HiOutlineMenu,
  HiOutlineMoon, HiOutlineSun, HiOutlineX, HiOutlineArrowLeft, HiOutlineUsers, HiOutlineTag, HiOutlineShieldCheck,
} from 'react-icons/hi';
import { logout } from '../../redux/slices/authSlice';
import API from '../../utils/api';
import ManagerRoute from '../manager/ManagerRoute';
import '../admin/admin.css';
import '../../pages/manager/manager.css';

// Aage ke phases me yahan Partner requests, Sellers, Deals jude honge
const MENU = [
  { name: 'Dashboard', path: '/manager', icon: HiOutlineHome, end: true },
  { name: 'Orders & Delivery', path: '/manager/orders', icon: HiOutlineClipboardList },
  { name: 'Partner requests', path: '/manager/partner-requests', icon: HiOutlineUserAdd, badge: 'requests' },
  { name: 'Sellers', path: '/manager/sellers', icon: HiOutlineUsers, badge: 'sellers' },
  { name: 'Seller deals', path: '/manager/deals', icon: HiOutlineTag, badge: 'deals' },
];

const ManagerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState(0); // naye partner applications jo review baaki hain
  const [sellerPending, setSellerPending] = useState(0); // verification review baaki
  const [dealPending, setDealPending] = useState(0); // deals jin par manager ka jawab baaki
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const loadBadge = useCallback(async () => {
    try {
      const { data } = await API.get('/partner-requests/manager/count');
      setPending(data.pending || 0);
    } catch { /* purani value rehne do */ }
    try {
      const { data } = await API.get('/seller/manager/count');
      setSellerPending(data.pending || 0);
    } catch { /* purani value rehne do */ }
    try {
      const { data } = await API.get('/deals/manager/count');
      setDealPending(data.pending || 0);
    } catch { /* purani value rehne do */ }
  }, []);
  useEffect(() => { loadBadge(); }, [loadBadge, location.pathname]);
  useEffect(() => {
    const t = setInterval(loadBadge, 30000);
    return () => clearInterval(t);
  }, [loadBadge]);

  const doLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <ManagerRoute>
      <div className="adm-shell">
        {menuOpen && <div className="adm-side-overlay" onClick={() => setMenuOpen(false)} />}
        <aside className={`adm-side ${menuOpen ? 'open' : ''}`}>
          <Link to="/manager" className="adm-brand">
            <span className="adm-brand-mark">★</span>
            <span><b>Manager Panel</b><small>Flipkart Clone</small></span>
            <button type="button" className="adm-side-close" aria-label="Close menu"
              onClick={(e) => { e.preventDefault(); setMenuOpen(false); }}>
              <HiOutlineX />
            </button>
          </Link>
          <nav className="adm-nav">
            <div className="adm-nav-label">OPERATIONS</div>
            {MENU.map((m) => (
              <NavLink key={m.path} to={m.path} end={m.end}
                className={({ isActive }) => `adm-link ${isActive ? 'on' : ''}`}>
                <m.icon /> {m.name}
                {m.badge === 'requests' && pending > 0 && <span className="mg-badge-btn">{pending}</span>}
                {m.badge === 'sellers' && sellerPending > 0 && <span className="mg-badge-btn">{sellerPending}</span>}
                {m.badge === 'deals' && dealPending > 0 && <span className="mg-badge-btn">{dealPending}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="adm-side-foot">
            {user?.role === 'superadmin' && <Link to="/superadmin" className="adm-link"><HiOutlineShieldCheck /> Super admin</Link>}
            <Link to="/" className="adm-link"><HiOutlineArrowLeft /> Back to store</Link>
            <button type="button" className="adm-link" style={{ width: '100%', background: 'none', border: 0, cursor: 'pointer' }} onClick={doLogout}>
              <HiOutlineLogout /> Logout
            </button>
          </div>
        </aside>

        <div className="adm-main">
          <header className="adm-topbar">
            <button className="adm-top-btn adm-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <HiOutlineMenu />
            </button>
            <span className="adm-top-title">Manager Panel</span>
            <div className="adm-top-right">
              <button className="adm-top-btn" onClick={() => setIsDark((d) => !d)} aria-label="Toggle dark mode">
                {isDark ? <HiOutlineSun /> : <HiOutlineMoon />}
              </button>
              <div className="adm-top-user">
                <span className="adm-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'M'}</span>
                <b>{user?.name}</b>
              </div>
            </div>
          </header>
          <div className="adm-content"><Outlet /></div>
        </div>
      </div>
    </ManagerRoute>
  );
};

export default ManagerLayout;
