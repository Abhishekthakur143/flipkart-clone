import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineSearch, HiOutlineTruck, HiOutlineCheckCircle, HiOutlineX, HiOutlineRefresh } from 'react-icons/hi';
import API from '../../utils/api';
import './Deliveries.css';

const ACTIVE = ['Assigned', 'Picked Up', 'Out for Delivery'];
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const code = (o) => o._id.slice(-8).toUpperCase();
const msg = (e, f = 'Something went wrong') => e?.response?.data?.message || f;

// Which step of the flow an order is in
const stageOf = (o) => {
  if (['Cancelled', 'Returned'].includes(o.orderStatus)) return 'closed';
  if (o.orderStatus === 'Delivered' || o.delivery?.status === 'Delivered') return 'done';
  if (ACTIVE.includes(o.delivery?.status)) return 'moving';
  if (o.orderStatus === 'Processing') return 'new';
  return 'ready'; // Confirmed (or Shipped after a failed attempt) and waiting for a delivery partner
};

const TABS = [
  { id: 'new', label: 'New orders', hint: 'Confirm to release for delivery' },
  { id: 'ready', label: 'Ready to assign', hint: 'Confirmed, waiting for a delivery partner' },
  { id: 'moving', label: 'With delivery partner', hint: 'Assigned and on the way' },
  { id: 'done', label: 'Delivered', hint: 'Completed orders' },
];

const tone = { Assigned: 'blue', 'Picked Up': 'amber', 'Out for Delivery': 'violet', Delivered: 'green', Failed: 'red' };

const Deliveries = () => {
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ready');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState('');
  const [pick, setPick] = useState(null); // order being assigned
  const [sel, setSel] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, p] = await Promise.all([API.get('/orders/admin/all'), API.get('/delivery/admin/partners')]);
      setOrders(o.data.orders || []);
      setPartners(p.data.partners || []);
    } catch (e) {
      toast.error(msg(e, 'Could not load orders'));
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const byId = useMemo(() => Object.fromEntries(partners.map((p) => [p._id, p])), [partners]);

  const grouped = useMemo(() => {
    const g = { new: [], ready: [], moving: [], done: [] };
    orders.forEach((o) => { const s = stageOf(o); if (g[s]) g[s].push(o); });
    return g;
  }, [orders]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = grouped[tab] || [];
    if (!t) return list;
    return list.filter((o) =>
      code(o).toLowerCase().includes(t) ||
      (o.user?.name || '').toLowerCase().includes(t) ||
      (o.shippingInfo?.name || '').toLowerCase().includes(t) ||
      String(o.shippingInfo?.pincode || '').includes(t) ||
      (o.shippingInfo?.city || '').toLowerCase().includes(t));
  }, [grouped, tab, q]);

  const confirm = async (o) => {
    setBusyId(o._id);
    try {
      await API.put(`/orders/admin/${o._id}`, { status: 'Confirmed' });
      toast.success(`Order #${code(o)} confirmed. Now assign a delivery partner.`);
      await load();
      setTab('ready');
    } catch (e) { toast.error(msg(e)); }
    setBusyId('');
  };

  const openAssign = (o) => { setPick(o); setSel(o.delivery?.partner || ''); };
  const assign = async () => {
    setSaving(true);
    try {
      const r = await API.put(`/delivery/admin/assign/${pick._id}`, { partnerId: sel });
      toast.success(r.data.message || 'Assigned');
      setPick(null);
      await load();
      setTab('moving');
    } catch (e) { toast.error(msg(e)); }
    setSaving(false);
  };

  const sortedPartners = useMemo(
    () => [...partners].filter((p) => p.isActive).sort((a, b) => (b.isAvailable - a.isAvailable) || (a.activeOrders - b.activeOrders)),
    [partners]
  );

  return (
    <div className="asg">
      <div className="asg-head">
        <div>
          <h1>Delivery Assignment</h1>
          <p>Confirm an order, then assign it to a delivery partner. The partner sees it only after you assign.</p>
        </div>
        <button className="asg-btn ghost" onClick={() => { setLoading(true); load(); }}><HiOutlineRefresh /> Refresh</button>
      </div>

      <div className="asg-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`asg-tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)} title={t.hint}>
            {t.label} <b>{grouped[t.id].length}</b>
          </button>
        ))}
      </div>

      <label className="asg-search">
        <HiOutlineSearch />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by order ID, customer, city or pincode" />
      </label>

      {loading ? (
        <>{[0, 1, 2].map((i) => <div key={i} className="asg-skel" />)}</>
      ) : shown.length === 0 ? (
        <div className="asg-empty">
          <h4>{q ? 'No matching orders' : 'Nothing here'}</h4>
          <p>{q ? 'Try a different search.' : TABS.find((t) => t.id === tab).hint + '.'}</p>
        </div>
      ) : (
        <div className="asg-list">
          {shown.map((o) => {
            const partner = byId[o.delivery?.partner];
            const dstatus = o.delivery?.status;
            return (
              <div className="asg-row" key={o._id}>
                <div>
                  <div className="asg-code">#{code(o)}</div>
                  <div className="asg-sub">{new Date(o.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div>
                </div>
                <div className="asg-cust">
                  <b>{o.shippingInfo?.name}</b>
                  <div className="asg-sub">{o.shippingInfo?.city}, {o.shippingInfo?.state} - {o.shippingInfo?.pincode}</div>
                </div>
                <div className="asg-amt">
                  <b>{inr(o.totalPrice)}</b>
                  <span className={`asg-pill ${o.paymentMethod === 'COD' ? 'amber' : 'green'}`}>{o.paymentMethod === 'COD' ? 'COD' : 'Prepaid'}</span>
                </div>
                <div>
                  {partner ? (
                    <div className="asg-partner">
                      <span className="av">{partner.name.charAt(0).toUpperCase()}</span>
                      <div style={{ minWidth: 0 }}>
                        <b>{partner.name}</b>
                        {dstatus && <span className={`asg-pill ${tone[dstatus] || 'gray'}`}>{dstatus}</span>}
                      </div>
                    </div>
                  ) : (
                    <span className="asg-none">{tab === 'new' ? <span className="asg-pill gray">Processing</span> : 'Not assigned yet'}</span>
                  )}
                  {dstatus === 'Failed' && <div className="asg-fail">Last attempt failed: {o.delivery.failReason}</div>}
                </div>
                <div className="act">
                  {tab === 'new' && (
                    <button className="asg-btn green sm" disabled={busyId === o._id} onClick={() => confirm(o)}>
                      <HiOutlineCheckCircle /> {busyId === o._id ? 'Confirming...' : 'Confirm order'}
                    </button>
                  )}
                  {tab === 'ready' && (
                    <button className="asg-btn sm" onClick={() => openAssign(o)}><HiOutlineTruck /> {dstatus === 'Failed' ? 'Reassign' : 'Assign delivery'}</button>
                  )}
                  {tab === 'moving' && (
                    <button className="asg-btn ghost sm" onClick={() => openAssign(o)}><HiOutlineTruck /> Reassign</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {pick && (
          <motion.div className="asg-ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !saving && setPick(null)}>
            <motion.div className="asg-modal" role="dialog" aria-label="Assign delivery partner" onClick={(e) => e.stopPropagation()}
              initial={{ y: 30, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
              <div className="asg-mh">
                <div>
                  <h3>Assign delivery partner</h3>
                  <p>Order #{code(pick)} · {pick.shippingInfo?.name} · {pick.shippingInfo?.city} {pick.shippingInfo?.pincode} · {pick.paymentMethod === 'COD' ? `COD ${inr(pick.totalPrice)}` : 'Prepaid'}</p>
                </div>
                <button className="asg-x" onClick={() => setPick(null)} aria-label="Close"><HiOutlineX /></button>
              </div>
              <div className="asg-mb">
                {sortedPartners.length === 0 ? (
                  <div className="asg-empty"><h4>No delivery partners yet</h4><p>Partners sign up at /delivery/register.</p></div>
                ) : sortedPartners.map((p) => (
                  <button key={p._id} className={`asg-opt ${sel === p._id ? 'on' : ''}`} onClick={() => setSel(p._id)}>
                    <span className="av">{p.name.charAt(0).toUpperCase()}</span>
                    <div>
                      <b>{p.name}</b>
                      <small>{p.vehicleType}{p.city ? ` · ${p.city}` : ''} · {p.phone}</small>
                    </div>
                    <div className="r">
                      <span className={`asg-pill ${p.isAvailable ? 'green' : 'gray'}`}>{p.isAvailable ? 'Online' : 'Offline'}</span>
                      <small>{p.activeOrders} active order{p.activeOrders === 1 ? '' : 's'}</small>
                    </div>
                  </button>
                ))}
              </div>
              <div className="asg-mf">
                <button className="asg-btn ghost" onClick={() => setPick(null)} disabled={saving}>Cancel</button>
                <button className="asg-btn" onClick={assign} disabled={!sel || saving}>{saving ? 'Assigning...' : 'Assign'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Deliveries;
