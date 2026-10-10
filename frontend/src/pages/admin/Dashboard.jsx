import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchDashboardStats,
  fetchAdminOrders,
  fetchAdminProducts,
  fetchAdminUsers,
} from '../../redux/slices/adminSlice';
import { formatPrice } from '../../utils/constants';
import {
  HiOutlineCurrencyRupee,
  HiOutlineUsers,
  HiOutlineShoppingBag,
  HiOutlineClipboardList,
  HiOutlineTruck,
  HiOutlineCheckCircle,
  HiOutlineX,
  HiOutlineChevronRight,
} from 'react-icons/hi';
import '../../components/admin/admin.css';

const STATUS_TONE = {
  Delivered: 'ok', Cancelled: 'bad', Shipped: 'info',
  'Out for Delivery': 'info', Confirmed: 'purple', Processing: 'warn',
};
const STATUS_COLOR = {
  Delivered: '#12b76a', Cancelled: '#f04438', Shipped: '#2874f0',
  'Out for Delivery': '#6a3df0', Confirmed: '#7a5af8', Processing: '#f79009',
};
const IN_PROGRESS = ['Confirmed', 'Shipped', 'Out for Delivery'];

const money = (n) => formatPrice(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const shortId = (o) => `#${o._id.slice(-8).toUpperCase()}`;
const methodName = (o) => (o.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online (Razorpay)');

const Section = ({ title, children }) => (
  <div className="adm-dr-sec">
    <h4>{title}</h4>
    {children}
  </div>
);

const Bars = ({ rows }) => {
  if (!rows.length) return <p className="adm-muted">No data yet.</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <>
      {rows.map((r) => (
        <div className="adm-bar-row" key={r.label}>
          <span className="adm-bar-label" title={r.label}>{r.label}</span>
          <div className="adm-bar-track">
            <div
              className="adm-bar-fill"
              style={{ width: `${(r.value / max) * 100}%`, background: r.color || 'linear-gradient(90deg,#2874f0,#6a3df0)' }}
            />
          </div>
          <span className="adm-bar-val">{r.display}</span>
        </div>
      ))}
    </>
  );
};

const OrderList = ({ list, empty }) =>
  list.length === 0 ? (
    <p className="adm-muted">{empty}</p>
  ) : (
    <>
      {list.map((o) => (
        <div className="adm-list-row" key={o._id}>
          <div className="adm-list-main">
            <b>{shortId(o)} · {o.user?.name || 'Unknown'}</b>
            <span>{fmtDate(o.createdAt)} · {o.items?.length || 0} items</span>
          </div>
          <div className="adm-list-end">
            <b>{money(o.totalPrice)}</b>
            <span className={`adm-badge ${STATUS_TONE[o.orderStatus] || 'gray'}`}>{o.orderStatus}</span>
          </div>
        </div>
      ))}
    </>
  );

const Dashboard = () => {
  const dispatch = useDispatch();
  const { stats, recentOrders, orders = [], products = [], users = [] } = useSelector((state) => state.admin);
  const [active, setActive] = useState(null);

  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchAdminOrders());
    dispatch(fetchAdminProducts());
    dispatch(fetchAdminUsers());
  }, [dispatch]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e) => e.key === 'Escape' && setActive(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  // Saare detail numbers yahin calculate hote hain
  const m = useMemo(() => {
    const sum = (list) => list.reduce((a, o) => a + (o.totalPrice || 0), 0);
    const group = (list, keyFn, valFn) => {
      const map = {};
      list.forEach((o) => {
        const k = keyFn(o);
        map[k] = map[k] || { count: 0, value: 0 };
        map[k].count += 1;
        map[k].value += valFn(o);
      });
      return map;
    };

    const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const nonCancelled = sorted.filter((o) => o.orderStatus !== 'Cancelled');
    const cancelled = sorted.filter((o) => o.orderStatus === 'Cancelled');

    // Backend ke total se jo basis match kare wahi use hoga
    const target = stats?.totalRevenue || 0;
    const includeCancelled =
      sorted.length > 0 && Math.abs(sum(sorted) - target) < Math.abs(sum(nonCancelled) - target);
    const counted = includeCancelled ? sorted : nonCancelled;
    const revenue = sum(counted);

    const byStatus = group(sorted, (o) => o.orderStatus, (o) => o.totalPrice || 0);
    const revByMethod = group(counted, methodName, (o) => o.totalPrice || 0);
    const ordByMethod = group(sorted, methodName, () => 1);

    const monthMap = {};
    counted.forEach((o) => {
      const d = new Date(o.createdAt);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[k] = (monthMap[k] || 0) + (o.totalPrice || 0);
    });
    const months = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([k, value]) => {
        const [y, mo] = k.split('-');
        return { label: new Date(y, mo - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), value };
      });

    const prodMap = {};
    counted.forEach((o) =>
      (o.items || []).forEach((it) => {
        const k = it.product || it.name;
        prodMap[k] = prodMap[k] || { name: it.name, units: 0, value: 0 };
        prodMap[k].units += it.quantity;
        prodMap[k].value += it.price * it.quantity;
      })
    );
    const topProducts = Object.values(prodMap).sort((a, b) => b.value - a.value).slice(0, 5);

    const custMap = {};
    counted.forEach((o) => {
      const k = o.user?._id || o.user?.name || 'unknown';
      custMap[k] = custMap[k] || { name: o.user?.name || 'Unknown', email: o.user?.email, orders: 0, value: 0 };
      custMap[k].orders += 1;
      custMap[k].value += o.totalPrice || 0;
    });
    const topCustomers = Object.values(custMap).sort((a, b) => b.value - a.value).slice(0, 5);

    const now = new Date();
    const sameMonth = (d) => {
      const x = new Date(d);
      return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear();
    };
    const delivered = sorted.filter((o) => o.orderStatus === 'Delivered');

    const outOfStock = products.filter((p) => p.stock <= 0);
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5);
    const byCat = {};
    products.forEach((p) => {
      const k = p.category?.name || 'Uncategorized';
      byCat[k] = (byCat[k] || 0) + 1;
    });

    return {
      sorted, counted, cancelled, includeCancelled, revenue,
      avg: counted.length ? revenue / counted.length : 0,
      byStatus, revByMethod, ordByMethod, months, topProducts, topCustomers,
      pending: sorted.filter((o) => o.orderStatus === 'Processing'),
      inProgress: sorted.filter((o) => IN_PROGRESS.includes(o.orderStatus)),
      delivered,
      deliveredRevenue: sum(delivered),
      deliveredThisMonth: delivered.filter((o) => sameMonth(o.createdAt)).length,
      inStock: products.filter((p) => p.stock > 0).length,
      outOfStock, lowStock, byCat,
      inventoryValue: products.reduce((a, p) => a + (p.price || 0) * (p.stock || 0), 0),
      topSold: [...products].filter((p) => p.totalSold > 0).sort((a, b) => b.totalSold - a.totalSold).slice(0, 5),
      admins: users.filter((u) => u.role === 'admin').length,
      newUsers: users.filter((u) => sameMonth(u.createdAt)).length,
      recentUsers: [...users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8),
    };
  }, [orders, products, users, stats]);

  if (!stats) {
    return (
      <div className="adm-spin-wrap">
        <div className="adm-spin" />
      </div>
    );
  }

  const cards = [
    { key: 'revenue', title: 'Total Revenue', value: formatPrice(stats.totalRevenue || 0), icon: HiOutlineCurrencyRupee, tone: 't-green' },
    { key: 'orders', title: 'Total Orders', value: stats.totalOrders, icon: HiOutlineClipboardList, tone: 't-blue' },
    { key: 'products', title: 'Total Products', value: stats.totalProducts, icon: HiOutlineShoppingBag, tone: 't-purple' },
    { key: 'users', title: 'Total Users', value: stats.totalUsers, icon: HiOutlineUsers, tone: 't-orange' },
    { key: 'pending', title: 'Pending Orders', value: stats.pendingOrders, icon: HiOutlineTruck, tone: 't-yellow' },
    { key: 'delivered', title: 'Delivered Orders', value: stats.deliveredOrders, icon: HiOutlineCheckCircle, tone: 't-teal' },
  ];

  const statusRows = (withMoney) =>
    Object.entries(m.byStatus).map(([s, v]) => ({
      label: s,
      value: withMoney ? v.value : v.count,
      display: withMoney ? money(v.value) : `${v.count} orders`,
      color: STATUS_COLOR[s],
    }));

  const panels = {
    revenue: {
      title: 'Total Revenue',
      icon: HiOutlineCurrencyRupee,
      big: money(stats.totalRevenue),
      sub: `${m.counted.length} orders ki kamai${m.includeCancelled ? '' : ' (cancelled orders ke bina)'}`,
      to: '/admin/orders',
      cta: 'View all orders',
      body: (
        <>
          <div className="adm-kpis">
            <div className="adm-kpi"><small>Orders counted</small><b>{m.counted.length}</b></div>
            <div className="adm-kpi"><small>Average order value</small><b>{money(m.avg)}</b></div>
            <div className="adm-kpi"><small>Delivered revenue</small><b>{money(m.deliveredRevenue)}</b></div>
            <div className="adm-kpi"><small>Cancelled orders</small><b>{m.cancelled.length}</b></div>
          </div>
          {Math.abs(m.revenue - (stats.totalRevenue || 0)) > 1 && (
            <div className="adm-note">
              Breakdown orders ki list se calculate hua hai ({money(m.revenue)}). Dashboard ka total backend se aata hai, isliye thoda alag ho sakta hai.
            </div>
          )}
          <Section title="Payment method se">
            <Bars rows={Object.entries(m.revByMethod).map(([k, v]) => ({ label: k, value: v.value, display: `${money(v.value)} · ${v.count}` }))} />
          </Section>
          <Section title="Order status se">
            <Bars rows={statusRows(true).filter((r) => m.includeCancelled || r.label !== 'Cancelled')} />
          </Section>
          <Section title="Mahine ke hisaab se">
            <Bars rows={m.months.map((x) => ({ label: x.label, value: x.value, display: money(x.value) }))} />
          </Section>
          <Section title="Top products (revenue)">
            {m.topProducts.length === 0 ? <p className="adm-muted">No data yet.</p> : m.topProducts.map((p) => (
              <div className="adm-list-row" key={p.name}>
                <div className="adm-list-main"><b>{p.name}</b><span>{p.units} units sold</span></div>
                <div className="adm-list-end"><b>{money(p.value)}</b></div>
              </div>
            ))}
          </Section>
          <Section title="Top customers">
            {m.topCustomers.length === 0 ? <p className="adm-muted">No data yet.</p> : m.topCustomers.map((c) => (
              <div className="adm-list-row" key={c.name + c.email}>
                <div className="adm-list-main"><b>{c.name}</b><span>{c.email || '—'} · {c.orders} orders</span></div>
                <div className="adm-list-end"><b>{money(c.value)}</b></div>
              </div>
            ))}
          </Section>
        </>
      ),
    },

    orders: {
      title: 'Total Orders',
      icon: HiOutlineClipboardList,
      big: stats.totalOrders,
      sub: 'Saare orders ek nazar me',
      to: '/admin/orders',
      cta: 'Manage orders',
      body: (
        <>
          <div className="adm-kpis">
            <div className="adm-kpi"><small>Average order value</small><b>{money(m.avg)}</b></div>
            <div className="adm-kpi"><small>Cancelled</small><b>{m.cancelled.length}</b></div>
          </div>
          <Section title="Status ke hisaab se"><Bars rows={statusRows(false)} /></Section>
          <Section title="Payment method">
            <Bars rows={Object.entries(m.ordByMethod).map(([k, v]) => ({ label: k, value: v.count, display: `${v.count} orders` }))} />
          </Section>
          <Section title="Latest orders"><OrderList list={m.sorted.slice(0, 8)} empty="No orders yet." /></Section>
        </>
      ),
    },

    products: {
      title: 'Total Products',
      icon: HiOutlineShoppingBag,
      big: stats.totalProducts,
      sub: 'Store me available products',
      to: '/admin/products',
      cta: 'Manage products',
      body: (
        <>
          <div className="adm-kpis">
            <div className="adm-kpi"><small>In stock</small><b>{m.inStock}</b></div>
            <div className="adm-kpi"><small>Out of stock</small><b>{m.outOfStock.length}</b></div>
            <div className="adm-kpi"><small>Low stock (5 ya kam)</small><b>{m.lowStock.length}</b></div>
            <div className="adm-kpi"><small>Inventory value</small><b>{money(m.inventoryValue)}</b></div>
          </div>
          <Section title="Category ke hisaab se">
            <Bars rows={Object.entries(m.byCat).map(([k, v]) => ({ label: k, value: v, display: `${v} products` }))} />
          </Section>
          {m.topSold.length > 0 && (
            <Section title="Sabse zyada bikne wale">
              {m.topSold.map((p) => (
                <div className="adm-list-row" key={p._id}>
                  <div className="adm-list-main"><b>{p.name}</b><span>{money(p.price)}</span></div>
                  <div className="adm-list-end"><b>{p.totalSold} sold</b></div>
                </div>
              ))}
            </Section>
          )}
          <Section title="Stock khatam / kam">
            {m.outOfStock.length + m.lowStock.length === 0 ? <p className="adm-muted">Sab products ka stock theek hai.</p> : (
              [...m.outOfStock, ...m.lowStock].map((p) => (
                <div className="adm-list-row" key={p._id}>
                  <div className="adm-list-main"><b>{p.name}</b><span>{p.category?.name || 'N/A'}</span></div>
                  <div className="adm-list-end">
                    <span className={`adm-badge ${p.stock > 0 ? 'warn' : 'bad'}`}>{p.stock > 0 ? `${p.stock} left` : 'Out of stock'}</span>
                  </div>
                </div>
              ))
            )}
          </Section>
        </>
      ),
    },

    users: {
      title: 'Total Users',
      icon: HiOutlineUsers,
      big: stats.totalUsers,
      sub: 'Registered accounts',
      to: '/admin/users',
      cta: 'Manage users',
      body: (
        <>
          <div className="adm-kpis">
            <div className="adm-kpi"><small>Customers</small><b>{users.length - m.admins}</b></div>
            <div className="adm-kpi"><small>Admins</small><b>{m.admins}</b></div>
            <div className="adm-kpi"><small>Is mahine naye</small><b>{m.newUsers}</b></div>
          </div>
          <Section title="Latest users">
            {m.recentUsers.length === 0 ? <p className="adm-muted">No users yet.</p> : m.recentUsers.map((u) => (
              <div className="adm-list-row" key={u._id}>
                <div className="adm-list-main"><b>{u.name}</b><span>{u.email} · Joined {fmtDate(u.createdAt)}</span></div>
                <div className="adm-list-end"><span className={`adm-badge ${u.role === 'admin' ? 'purple' : 'info'}`}>{u.role}</span></div>
              </div>
            ))}
          </Section>
        </>
      ),
    },

    pending: {
      title: 'Pending Orders',
      icon: HiOutlineTruck,
      big: stats.pendingOrders,
      sub: 'Jinhe abhi process karna baaki hai',
      to: '/admin/orders?status=Processing',
      cta: 'Open pending orders',
      body: (
        <>
          <Section title="Processing (action chahiye)">
            <OrderList list={m.pending} empty="Koi pending order nahi hai 🎉" />
          </Section>
          <Section title={`Raste me (${m.inProgress.length})`}>
            <OrderList list={m.inProgress} empty="Abhi koi order raste me nahi hai." />
          </Section>
        </>
      ),
    },

    delivered: {
      title: 'Delivered Orders',
      icon: HiOutlineCheckCircle,
      big: stats.deliveredOrders,
      sub: 'Customer tak pahunch chuke orders',
      to: '/admin/orders?status=Delivered',
      cta: 'Open delivered orders',
      body: (
        <>
          <div className="adm-kpis">
            <div className="adm-kpi"><small>Delivered revenue</small><b>{money(m.deliveredRevenue)}</b></div>
            <div className="adm-kpi"><small>Is mahine delivered</small><b>{m.deliveredThisMonth}</b></div>
          </div>
          <Section title="Delivered orders"><OrderList list={m.delivered.slice(0, 15)} empty="No delivered orders yet." /></Section>
        </>
      ),
    },
  };

  const panel = active ? panels[active] : null;

  return (
    <div className="adm-stack">
      {/* Page Header */}
      <div>
        <h1 className="adm-title">Dashboard</h1>
        <p className="adm-sub">Welcome back! Kisi bhi card par click karke poori detail dekho.</p>
      </div>

      {/* Stat Cards Grid (clickable) */}
      <div className="adm-stats">
        {cards.map((card) => (
          <button key={card.key} className="adm-stat" onClick={() => setActive(card.key)}>
            <span className={`adm-stat-ico ${card.tone}`}><card.icon /></span>
            <span>
              <small>{card.title}</small>
              <b>{card.value}</b>
            </span>
            <span className="adm-stat-go">Details <HiOutlineChevronRight /></span>
          </button>
        ))}
      </div>

      {/* Recent Orders Table */}
      <div className="adm-card">
        <div className="adm-card-head">
          <h2>Recent Orders</h2>
          <Link to="/admin/orders" className="adm-link-sm">View All</Link>
        </div>
        {recentOrders && recentOrders.length > 0 ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {recentOrders.slice(0, 5).map((order) => (
                  <tr key={order._id}>
                    <td className="adm-id">{shortId(order)}</td>
                    <td>
                      <span className="adm-strong">{order.user?.name || 'Unknown'}</span>
                      <p className="adm-muted" style={{ margin: 0 }}>{order.user?.email}</p>
                    </td>
                    <td className="adm-strong">{formatPrice(order.totalPrice)}</td>
                    <td><span className={`adm-badge ${STATUS_TONE[order.orderStatus] || 'warn'}`}>{order.orderStatus}</span></td>
                    <td>{fmtDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="adm-empty">No orders found. Start adding products!</div>
        )}
      </div>

      {/* Quick Info Section */}
      <div className="adm-promos">
        <div className="adm-promo blue">
          <h3>Ready to add products?</h3>
          <p>Go to the Products section and click 'Add Product' to start filling your store.</p>
          <Link to="/admin/product/new">Add Product</Link>
        </div>
        <div className="adm-promo orange">
          <h3>Create Coupons</h3>
          <p>Attract more customers by offering discount codes for special occasions.</p>
          <Link to="/admin/coupons">Create Coupon</Link>
        </div>
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {panel && (
          <motion.div
            key="overlay"
            className="adm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
          />
        )}
        {panel && (
          <motion.aside
            key="drawer"
            className="adm-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
          >
            <div className="adm-dr-head">
              <button className="adm-dr-close" onClick={() => setActive(null)} aria-label="Close"><HiOutlineX /></button>
              <div className="adm-dr-top">
                <span className="adm-dr-ico"><panel.icon /></span>
                {panel.title}
              </div>
              <div className="adm-dr-big">{panel.big}</div>
              <p className="adm-dr-sub">{panel.sub}</p>
            </div>
            <div className="adm-dr-body">{panel.body}</div>
            <div className="adm-dr-foot">
              <Link to={panel.to} className="adm-btn block">{panel.cta} <HiOutlineChevronRight /></Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;