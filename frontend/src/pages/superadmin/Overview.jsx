import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineShieldCheck, HiOutlineCog, HiOutlineBriefcase, HiOutlineShoppingBag, HiOutlineUsers, HiOutlineRefresh,
} from 'react-icons/hi';
import API from '../../utils/api';
import '../../components/admin/admin.css';

const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const Overview = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try { setData((await API.get('/superadmin/overview')).data); }
    catch (e) { const m = e.response?.data?.message || 'Could not load the overview'; setError(m); toast.error(m); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error && !data) return <div className="adm-card adm-pad"><p className="adm-sub" style={{ marginBottom: 14 }}>{error}</p><button className="adm-btn" onClick={load}><HiOutlineRefresh /> Try again</button></div>;
  if (!data) return <div className="adm-spin-wrap"><div className="adm-spin" /></div>;
  const c = data.counts; const w = data.waiting;
  const cards = [
    { t: 'Super admins', v: c.superadmin, i: HiOutlineShieldCheck, tone: 't-purple', to: '/superadmin/accounts?role=superadmin' },
    { t: 'Admins', v: c.admin, i: HiOutlineCog, tone: 't-blue', to: '/superadmin/accounts?role=admin' },
    { t: 'Managers', v: c.manager, i: HiOutlineBriefcase, tone: 't-orange', to: '/superadmin/accounts?role=manager' },
    { t: 'Sellers', v: c.seller, i: HiOutlineShoppingBag, tone: 't-green', to: '/superadmin/sellers' },
    { t: 'Customers', v: c.user, i: HiOutlineUsers, tone: 't-teal', to: '/superadmin/accounts?role=user' },
  ];
  const waiting = [
    ['Delivery partners waiting for admin', w.partnerApprovals], ['Product deals waiting for admin', w.dealApprovals],
    ['Seller requests waiting for manager', w.sellerRequests], ['Seller forms waiting for manager', w.sellerVerifications],
  ];
  return (
    <div className="adm-stack">
      <div className="adm-head" style={{ marginBottom: 0 }}>
        <div><h1 className="adm-title">Super Admin</h1><p className="adm-sub">Sab roles ek jagah: accounts, sellers aur kisne kya kiya.</p></div>
        <button className="adm-btn ghost" onClick={load}><HiOutlineRefresh /> Refresh</button>
      </div>
      <div className="adm-stats">
        {cards.map((x) => (
          <Link key={x.t} to={x.to} className="adm-stat" style={{ textDecoration: 'none' }}>
            <span className={`adm-stat-ico ${x.tone}`}><x.i /></span>
            <span><small>{x.t}</small><b>{x.v}</b></span>
          </Link>
        ))}
      </div>
      {data.disabled > 0 && <div className="dl-banner warn" role="status"><div><b>{data.disabled} staff/seller account(s) disabled</b><Link to="/superadmin/accounts" style={{ fontWeight: 700 }}>Accounts dekho →</Link></div></div>}
      <div className="adm-two" style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}>
        <div className="adm-card adm-pad">
          <h2 className="adm-card-title">Waiting for a decision</h2>
          {waiting.map(([k, v]) => <div className="adm-list-row" key={k}><div className="adm-list-main"><span>{k}</span><b>{v}</b></div></div>)}
        </div>
        <div className="adm-card adm-pad">
          <div className="adm-card-head" style={{ padding: 0, marginBottom: 8 }}><h2>Latest activity</h2><Link className="adm-link-sm" to="/superadmin/activity">View all</Link></div>
          {data.recent.length === 0 && <p className="adm-sub">Abhi koi activity nahi.</p>}
          {data.recent.map((l) => (
            <div className="adm-list-row" key={l._id}><div className="adm-list-main" style={{ display: 'block' }}>
              <b style={{ whiteSpace: 'normal' }}>{l.action}</b>
              <span style={{ display: 'block' }}>{l.name} · {l.role} · {when(l.createdAt)}</span>
            </div></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Overview;
