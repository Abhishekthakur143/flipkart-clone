import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  HiOutlineHome, HiOutlineUsers, HiOutlineShoppingBag, HiOutlineClipboardList, HiOutlineLogout, HiOutlineMenu,
  HiOutlineMoon, HiOutlineSun, HiOutlineX, HiOutlineArrowLeft, HiOutlineShieldCheck, HiOutlineLockClosed,
  HiOutlineBriefcase, HiOutlineCog, HiOutlineTruck, HiOutlineUserGroup,
} from 'react-icons/hi';
import { logout } from '../../redux/slices/authSlice';
import StaffRoute from '../StaffRoute';
import AdminGate from '../admin/AdminGate';
import { lockAdminPanel } from '../../utils/adminUnlock';
import '../admin/admin.css';
import '../../pages/manager/manager.css';

const OWN = [
  { name: 'Overview', path: '/superadmin', icon: HiOutlineHome, end: true },
  { name: 'Accounts', path: '/superadmin/accounts', icon: HiOutlineUsers },
  { name: 'Sellers', path: '/superadmin/sellers', icon: HiOutlineShoppingBag },
  { name: 'Activity log', path: '/superadmin/activity', icon: HiOutlineClipboardList },
  { name: 'Partner app', path: '/superadmin/delivery-partners', icon: HiOutlineTruck },
];
const PANELS = [
  { name: 'Admin panel', path: '/admin', icon: HiOutlineCog },
  { name: 'Manager panel', path: '/manager', icon: HiOutlineBriefcase },
  { name: 'Deliveries', path: '/admin/deliveries', icon: HiOutlineTruck },
  { name: 'Delivery partners', path: '/admin/delivery-partners', icon: HiOutlineUserGroup },
];

const SuperAdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const doLogout = () => { dispatch(logout()); navigate('/login', { replace: true }); };

  return (
    <StaffRoute roles={['superadmin']}>
      <AdminGate>
        <div className="adm-shell">
          {menuOpen && <div className="adm-side-overlay" onClick={() => setMenuOpen(false)} />}
          <aside className={`adm-side ${menuOpen ? 'open' : ''}`}>
            <Link to="/superadmin" className="adm-brand">
              <span className="adm-brand-mark">♛</span>
              <span><b>Super Admin</b><small>Flipkart Clone</small></span>
              <button type="button" className="adm-side-close" aria-label="Close menu"
                onClick={(e) => { e.preventDefault(); setMenuOpen(false); }}><HiOutlineX /></button>
            </Link>
            <nav className="adm-nav">
              <div className="adm-nav-label">CONTROL</div>
              {OWN.map((m) => (
                <NavLink key={m.path} to={m.path} end={m.end} className={({ isActive }) => `adm-link ${isActive ? 'on' : ''}`}>
                  <m.icon /> {m.name}
                </NavLink>
              ))}
              <div className="adm-nav-label">OPEN PANELS</div>
              {PANELS.map((m) => (
                <NavLink key={m.path} to={m.path} className="adm-link"><m.icon /> {m.name}</NavLink>
              ))}
            </nav>
            <div className="adm-side-foot">
              <Link to="/" className="adm-link"><HiOutlineArrowLeft /> Back to store</Link>
              <button type="button" className="adm-link" style={{ width: '100%', background: 'none', border: 0, cursor: 'pointer' }} onClick={doLogout}>
                <HiOutlineLogout /> Logout
              </button>
            </div>
          </aside>

          <div className="adm-main">
            <header className="adm-topbar">
              <button className="adm-top-btn adm-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu"><HiOutlineMenu /></button>
              <span className="adm-top-title"><HiOutlineShieldCheck style={{ verticalAlign: '-2px' }} /> Super Admin</span>
              <div className="adm-top-right">
                <button className="adm-top-btn" onClick={lockAdminPanel} aria-label="Lock panel" title="Lock panel"><HiOutlineLockClosed /></button>
                <button className="adm-top-btn" onClick={() => setIsDark((d) => !d)} aria-label="Toggle dark mode">{isDark ? <HiOutlineSun /> : <HiOutlineMoon />}</button>
                <div className="adm-top-user">
                  <span className="adm-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'S'}</span>
                  <b>{user?.name}</b>
                </div>
              </div>
            </header>
            <div className="adm-content"><Outlet /></div>
          </div>
        </div>
      </AdminGate>
    </StaffRoute>
  );
};

export default SuperAdminLayout;
