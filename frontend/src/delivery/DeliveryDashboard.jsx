import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  HiOutlineViewGrid, HiOutlineClipboardList, HiOutlineCash, HiOutlineUser, HiOutlineLogout,
  HiOutlineMoon, HiOutlineSun, HiOutlineRefresh,
} from 'react-icons/hi';
import { dv, errMsg, tokenStore } from './deliveryApi';
import { useDvTheme } from './ui';
import { Overview, OrdersSection, EarningsSection, ProfileSection } from './Sections';
import OrderDrawer from './OrderDrawer';
import './delivery.css';

const NAV = [
  { id: 'overview', label: 'Overview', icon: HiOutlineViewGrid, title: 'Dashboard' },
  { id: 'orders', label: 'My Orders', icon: HiOutlineClipboardList, title: 'My Orders' },
  { id: 'earnings', label: 'Earnings', icon: HiOutlineCash, title: 'Earnings' },
  { id: 'profile', label: 'Profile', icon: HiOutlineUser, title: 'Profile' },
];

const DeliveryDashboard = () => {
  const navigate = useNavigate();
  const [theme, toggleTheme] = useDvTheme();
  const [tab, setTab] = useState('overview');
  const [partner, setPartner] = useState(null);
  const [stats, setStats] = useState(null);
  const [active, setActive] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [spin, setSpin] = useState(false);

  const load = useCallback(async (quiet = false) => {
    try {
      const [me, s, a, c] = await Promise.all([dv.me(), dv.stats(), dv.orders('active'), dv.orders('completed')]);
      setPartner(me); setStats(s); setActive(a); setCompleted(c);
    } catch (e) {
      if (!quiet) toast.error(errMsg(e, 'Could not load your data'));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // pick up new assignments without a manual refresh
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden && !openId) load(true); }, 30000);
    return () => clearInterval(t);
  }, [load, openId]);

  const opened = useMemo(
    () => [...active, ...completed].find((o) => o._id === openId) || null,
    [active, completed, openId]
  );

  if (!tokenStore.get()) return <Navigate to="/delivery/login" replace />;

  const logout = () => { tokenStore.clear(); toast.success('Logged out'); navigate('/delivery/login', { replace: true }); };
  const refresh = async () => { setSpin(true); await load(); setSpin(false); };
  const toggleOnline = async () => {
    const next = !partner.isAvailable;
    setPartner({ ...partner, isAvailable: next });
    try { await dv.setAvailability(next); toast.success(next ? 'You are online' : 'You are offline'); }
    catch (e) { setPartner({ ...partner }); toast.error(errMsg(e)); }
  };

  const cur = NAV.find((n) => n.id === tab);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="dv-root" data-theme={theme}>
      <div className="dv-shell">
        <aside className="dv-side">
          <div className="dv-logo"><i>★</i> Flipkart Delivery</div>
          {NAV.map((n) => (
            <button key={n.id} className={`dv-nav ${tab === n.id ? 'on' : ''}`} onClick={() => setTab(n.id)}>
              <n.icon /> {n.label}
              {n.id === 'orders' && active.length > 0 && <span className="count">{active.length}</span>}
            </button>
          ))}
          <div className="grow" />
          {partner && (
            <div className="dv-me">
              <span className="dv-avatar">{partner.name.charAt(0).toUpperCase()}</span>
              <div style={{ minWidth: 0 }}><b>{partner.name}</b><small>{partner.vehicleType}{partner.vehicleNumber ? ` · ${partner.vehicleNumber}` : ''}</small></div>
            </div>
          )}
          <button className="dv-nav" onClick={logout}><HiOutlineLogout /> Logout</button>
        </aside>

        <div className="dv-main">
          <header className="dv-top">
            <div>
              <h1>{tab === 'overview' && partner ? `${greet}, ${partner.name.split(' ')[0]}` : cur.title}</h1>
              <p className="sub">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <div className="right">
              {partner && (
                <button className={`dv-switch ${partner.isAvailable ? 'on' : ''}`} onClick={toggleOnline} aria-pressed={partner.isAvailable}>
                  <i className="pulse" /><span className="lbl">{partner.isAvailable ? 'Online' : 'Offline'}</span><i className="tr" />
                </button>
              )}
              <button className="dv-icon-btn" onClick={refresh} aria-label="Refresh"><HiOutlineRefresh style={spin ? { animation: 'dvSpin .7s linear infinite' } : {}} /></button>
              <button className="dv-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">{theme === 'dark' ? <HiOutlineSun /> : <HiOutlineMoon />}</button>
              <button className="dv-icon-btn dv-logout-m" onClick={logout} aria-label="Logout"><HiOutlineLogout /></button>
            </div>
          </header>

          <main className="dv-content">
            {tab === 'overview' && partner && (
              <Overview stats={stats} active={active} loading={loading} partner={partner} onOpen={setOpenId} goOrders={() => setTab('orders')} />
            )}
            {tab === 'orders' && <OrdersSection active={active} completed={completed} loading={loading} onOpen={setOpenId} />}
            {tab === 'earnings' && <EarningsSection stats={stats} completed={completed} loading={loading} />}
            {tab === 'profile' && partner && <ProfileSection partner={partner} onSaved={setPartner} />}
          </main>
        </div>
      </div>

      {/* mobile bottom tabs */}
      <nav className="dv-tabs">
        {NAV.map((n) => (
          <button key={n.id} className={tab === n.id ? 'on' : ''} onClick={() => setTab(n.id)}>
            <n.icon />{n.label}
            {n.id === 'orders' && active.length > 0 && <span className="count">{active.length}</span>}
          </button>
        ))}
      </nav>

      <AnimatePresence>
        {opened && <OrderDrawer key={opened._id} order={opened} onClose={() => setOpenId(null)} onChanged={() => load(true)} />}
      </AnimatePresence>
    </div>
  );
};

export default DeliveryDashboard;
