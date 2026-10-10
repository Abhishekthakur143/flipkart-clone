import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineShoppingBag,
  HiOutlineUsers,
  HiOutlineUserGroup,
  HiOutlineTag,
  HiOutlineClipboardList,
  HiOutlineTicket,
  HiOutlineTruck,
  HiOutlineArrowLeft,
  HiOutlineX,
} from 'react-icons/hi';
import API from '../../utils/api';
import './admin.css';

const menuItems = [
  { name: 'Dashboard', path: '/admin', icon: HiOutlineHome },
  { name: 'Products', path: '/admin/products', icon: HiOutlineShoppingBag },
  { name: 'Orders', path: '/admin/orders', icon: HiOutlineClipboardList },
  { name: 'Categories', path: '/admin/categories', icon: HiOutlineTag },
  { name: 'Users', path: '/admin/users', icon: HiOutlineUsers },
  { name: 'Delivery Partners', path: '/admin/delivery-partners', icon: HiOutlineUserGroup },
  { name: 'Coupons', path: '/admin/coupons', icon: HiOutlineTicket },
];

const ACTIVE = ['Assigned', 'Picked Up', 'Out for Delivery'];

const AdminSidebar = ({ open = false, onClose = () => {} }) => {
  const location = useLocation();
  const path = location.pathname;

  // Delivery menu: hidden until the admin has CONFIRMED at least one order
  const [ready, setReady] = useState(0);   // confirmed, waiting for a delivery partner
  const [moving, setMoving] = useState(0); // already with a delivery partner

  const loadCounts = useCallback(async () => {
    try {
      const { data } = await API.get('/orders/admin/all');
      let r = 0;
      let m = 0;
      (data.orders || []).forEach((o) => {
        if (['Cancelled', 'Returned', 'Delivered', 'Processing'].includes(o.orderStatus)) return;
        if (ACTIVE.includes(o.delivery?.status)) m += 1;
        else r += 1; // Confirmed (or Shipped after a failed attempt) and not assigned
      });
      setReady(r);
      setMoving(m);
    } catch {
      /* keep the previous state */
    }
  }, []);

  // refresh on page change, when the tab regains focus, and every 20s
  useEffect(() => { loadCounts(); }, [loadCounts, path]);
  useEffect(() => {
    const t = setInterval(loadCounts, 20000);
    window.addEventListener('focus', loadCounts);
    return () => { clearInterval(t); window.removeEventListener('focus', loadCounts); };
  }, [loadCounts]);

  const showDelivery = ready + moving > 0 || path.startsWith('/admin/deliveries');

  // Product edit/new page par bhi "Products" highlight rahe
  const isActive = (p) =>
    p === '/admin'
      ? path === '/admin'
      : path.startsWith(p) || (p === '/admin/products' && path.startsWith('/admin/product/'));

  const items = showDelivery
    ? [...menuItems.slice(0, 3), { name: 'Deliveries', path: '/admin/deliveries', icon: HiOutlineTruck, badge: ready }, ...menuItems.slice(3)]
    : menuItems;

  return (
    <>
      {open && <div className="adm-side-overlay" onClick={onClose} />}
      <aside className={`adm-side ${open ? 'open' : ''}`}>
        <Link to="/admin" className="adm-brand" onClick={onClose}>
          <span className="adm-brand-mark">★</span>
          <span>
            <b>Admin Panel</b>
            <small>Flipkart Clone</small>
          </span>
          <button
            type="button"
            className="adm-side-close"
            aria-label="Close menu"
            onClick={(e) => { e.preventDefault(); onClose(); }}
          >
            <HiOutlineX />
          </button>
        </Link>

        <nav className="adm-nav">
          <div className="adm-nav-label">MANAGE</div>
          {items.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={`adm-link ${isActive(item.path) ? 'on' : ''}`}
            >
              <item.icon />
              {item.name}
              {item.badge > 0 && (
                <span
                  style={{
                    marginLeft: 'auto', minWidth: 22, height: 20, padding: '0 7px', borderRadius: 99,
                    display: 'grid', placeItems: 'center', fontSize: 11.5, fontWeight: 800,
                    background: '#2874f0', color: '#fff',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="adm-side-foot">
          <Link to="/" className="adm-link" onClick={onClose}>
            <HiOutlineArrowLeft />
            Back to store
          </Link>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;