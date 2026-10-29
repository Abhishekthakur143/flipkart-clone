import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineShoppingBag, HiOutlineCube, HiOutlineClock, HiOutlineClipboardCheck,
  HiOutlineTruck, HiOutlineCheckCircle, HiOutlineRefresh,
} from 'react-icons/hi';
import API from '../../utils/api';
import { formatPrice } from '../../utils/constants';
import '../../components/admin/admin.css';
import './manager.css';

const code = (o) => `#${o._id.slice(-8).toUpperCase()}`;
const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const FILTERS = [['all', 'All'], ['low', 'Low stock'], ['out', 'Out of stock']];

const OrderRows = ({ list, empty, showPartner }) =>
  list.length === 0 ? <p className="adm-muted">{empty}</p> : (
    <>
      {list.map((o) => (
        <div className="adm-list-row" key={o._id}>
          <div className="adm-list-main">
            <b>{code(o)} · {o.user?.name || 'Customer'}</b>
            <span>{when(o.createdAt)} · {o.itemCount} item{o.itemCount === 1 ? '' : 's'} · {o.city}</span>
          </div>
          <div className="adm-list-end">
            <b>{formatPrice(o.totalPrice)}</b>
            <span className={`adm-badge ${showPartner ? 'info' : 'warn'}`}>
              {showPartner ? `${o.partner?.name || 'Partner'} · ${o.deliveryStatus}` : o.orderStatus}
            </span>
          </div>
        </div>
      ))}
    </>
  );

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const load = async () => {
    setError('');
    try {
      const r = await API.get('/manager/dashboard');
      setData(r.data);
    } catch (e) {
      const m = e.response?.data?.message || 'Could not load the dashboard';
      setError(m);
      toast.error(m);
    }
  };
  useEffect(() => { load(); }, []);

  const limit = data?.lowStockLimit || 5;
  const shown = useMemo(() => {
    if (!data) return [];
    const t = q.trim().toLowerCase();
    return data.products.filter((p) => {
      if (filter === 'low' && !(p.stock > 0 && p.stock <= limit)) return false;
      if (filter === 'out' && p.stock > 0) return false;
      return !t || p.name.toLowerCase().includes(t) || p.category.toLowerCase().includes(t);
    });
  }, [data, filter, q, limit]);

  if (error && !data) {
    return (
      <div className="adm-card adm-pad">
        <h2 className="adm-card-title">Dashboard load nahi hua</h2>
        <p className="adm-sub" style={{ marginBottom: 16 }}>{error}</p>
        <button className="adm-btn" onClick={load}><HiOutlineRefresh /> Try again</button>
      </div>
    );
  }
  if (!data) return <div className="adm-spin-wrap"><div className="adm-spin" /></div>;

  const s = data.stats;
  const cards = [
    { t: 'Total Products', v: s.totalProducts, i: HiOutlineShoppingBag, tone: 't-purple' },
    { t: 'Units in Stock', v: s.totalStock, i: HiOutlineCube, tone: 't-blue', sub: `${s.outOfStock} out · ${s.lowStock} low` },
    { t: 'Pending Orders', v: s.pendingOrders, i: HiOutlineClock, tone: 't-yellow', sub: 'Confirm karna baaki', to: '/manager/orders?tab=new' },
    { t: 'Ready to Assign', v: s.readyToAssign, i: HiOutlineClipboardCheck, tone: 't-orange', sub: 'Delivery boy chahiye', to: '/manager/orders?tab=ready' },
    { t: 'Delivery Orders', v: s.deliveryOrders, i: HiOutlineTruck, tone: 't-teal', sub: 'Delivery boy ke paas', to: '/manager/orders?tab=moving' },
    { t: 'Delivered', v: s.deliveredOrders, i: HiOutlineCheckCircle, tone: 't-green', to: '/manager/orders?tab=done' },
  ];

  return (
    <div className="adm-stack">
      <div className="adm-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="adm-title">Manager Dashboard</h1>
          <p className="adm-sub">Products, stock aur orders ka poora hisaab ek jagah.</p>
        </div>
        <button className="adm-btn ghost" onClick={load}><HiOutlineRefresh /> Refresh</button>
      </div>

      <div className="adm-stats">
        {cards.map((c) => {
          const body = (
            <>
              <span className={`adm-stat-ico ${c.tone}`}><c.i /></span>
              <span><small>{c.t}</small><b>{c.v}</b>{c.sub && <small style={{ marginTop: 2, fontSize: 12 }}>{c.sub}</small>}</span>
            </>
          );
          return c.to
            ? <Link key={c.t} to={c.to} className="adm-stat" style={{ textDecoration: 'none' }}>{body}</Link>
            : <div key={c.t} className="adm-stat" style={{ cursor: 'default' }}>{body}</div>;
        })}
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h2>Stock per product</h2>
          <input className="adm-input adm-search" style={{ height: 40 }} placeholder="Search product or category"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div style={{ padding: '16px 22px 0' }} className="adm-chips">
          {FILTERS.map(([id, label]) => (
            <button key={id} className={`adm-chip ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)}>
              {label}
              <em>{id === 'all' ? data.products.length : id === 'low' ? s.lowStock : s.outOfStock}</em>
            </button>
          ))}
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Sold</th><th>Stock left</th></tr></thead>
            <tbody>
              {shown.map((p) => {
                const pct = Math.min(100, (Math.max(p.stock, 0) / 50) * 100);
                const color = p.stock <= 0 ? '#f04438' : p.stock <= limit ? '#f79009' : '#12b76a';
                return (
                  <tr key={p._id}>
                    <td>
                      <div className="adm-prod">
                        {p.image ? <img src={p.image} alt="" /> : <span style={{ width: 48 }} />}
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td>{p.category || '—'}</td>
                    <td>{formatPrice(p.price)}</td>
                    <td>{p.totalSold || 0}</td>
                    <td>
                      <div className="mg-stock">
                        <div className="mg-stock-track"><div className="mg-stock-fill" style={{ width: `${pct}%`, background: color }} /></div>
                        <b>{Math.max(p.stock, 0)}</b>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {shown.length === 0 && <div className="adm-empty">{data.products.length === 0 ? 'Abhi koi product nahi hai.' : 'Koi product match nahi hua.'}</div>}
        </div>
      </div>

      <div className="mg-two">
        <div className="adm-card adm-pad">
          <div className="adm-card-head" style={{ padding: '0 0 14px' }}>
            <h2>Pending orders</h2><Link className="adm-link-sm" to="/manager/orders?tab=new">Open</Link>
          </div>
          <OrderRows list={data.pending} empty="Koi pending order nahi hai." />
        </div>
        <div className="adm-card adm-pad">
          <div className="adm-card-head" style={{ padding: '0 0 14px' }}>
            <h2>Delivery orders</h2><Link className="adm-link-sm" to="/manager/orders?tab=moving">Open</Link>
          </div>
          <OrderRows list={data.delivery} empty="Abhi koi order delivery boy ke paas nahi hai." showPartner />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
