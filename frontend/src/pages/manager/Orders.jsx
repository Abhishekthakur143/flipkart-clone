import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineTruck, HiOutlineCheckCircle, HiOutlineRefresh, HiOutlineX } from 'react-icons/hi';
import API from '../../utils/api';
import { formatPrice } from '../../utils/constants';
import '../../components/admin/admin.css';
import './manager.css';

const ACTIVE = ['Assigned', 'Picked Up', 'Out for Delivery'];
const code = (o) => o._id.slice(-8).toUpperCase();
const msg = (e, f = 'Something went wrong') => e?.response?.data?.message || f;

const stageOf = (o) => {
  if (['Cancelled', 'Returned'].includes(o.orderStatus)) return 'closed';
  if (o.orderStatus === 'Delivered' || o.delivery?.status === 'Delivered') return 'done';
  if (ACTIVE.includes(o.delivery?.status)) return 'moving';
  if (o.orderStatus === 'Processing') return 'new';
  return 'ready';
};

const TABS = [
  { id: 'new', label: 'New orders', hint: 'Confirm karo, tab delivery ke liye release hoga' },
  { id: 'ready', label: 'Ready to assign', hint: 'Confirmed, delivery boy chahiye' },
  { id: 'moving', label: 'With delivery partner', hint: 'Assign ho chuke, raste me' },
  { id: 'done', label: 'Delivered', hint: 'Complete orders' },
];
const tone = { Assigned: 'info', 'Picked Up': 'warn', 'Out for Delivery': 'purple', Delivered: 'ok', Failed: 'bad' };

const Orders = () => {
  const [params, setParams] = useSearchParams();
  const initial = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'new';
  const [tab, setTab] = useState(initial);
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState('');
  const [pick, setPick] = useState(null);
  const [sel, setSel] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, p] = await Promise.all([API.get('/manager/orders'), API.get('/manager/partners')]);
      setOrders(o.data.orders || []);
      setPartners(p.data.partners || []);
    } catch (e) {
      toast.error(msg(e, 'Orders load nahi hue'));
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const go = (id) => { setTab(id); setParams({ tab: id }, { replace: true }); };
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
      (o.shippingInfo?.city || '').toLowerCase().includes(t) ||
      String(o.shippingInfo?.pincode || '').includes(t));
  }, [grouped, tab, q]);

  const confirm = async (o) => {
    setBusyId(o._id);
    try {
      await API.put(`/manager/orders/${o._id}/confirm`);
      toast.success(`Order #${code(o)} confirmed. Ab delivery boy assign karo.`);
      await load();
      go('ready');
    } catch (e) { toast.error(msg(e)); }
    setBusyId('');
  };

  const openAssign = (o) => { setPick(o); setSel(o.delivery?.partner?._id || o.delivery?.partner || ''); };
  const assign = async () => {
    setSaving(true);
    try {
      const r = await API.put(`/manager/assign/${pick._id}`, { partnerId: sel });
      toast.success(r.data.message || 'Assigned');
      setPick(null);
      await load();
      go('moving');
    } catch (e) { toast.error(msg(e)); }
    setSaving(false);
  };

  const sortedPartners = useMemo(
    () => [...partners].filter((p) => p.isActive).sort((a, b) => (b.isAvailable - a.isAvailable) || (a.activeOrders - b.activeOrders)),
    [partners]
  );

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Orders & Delivery</h1>
          <p className="adm-sub">Order confirm karo, phir delivery boy ko assign karo. Delivery boy ko order assign hone ke baad hi dikhta hai.</p>
        </div>
        <button className="adm-btn ghost" onClick={() => { setLoading(true); load(); }}><HiOutlineRefresh /> Refresh</button>
      </div>

      <div className="adm-chips">
        {TABS.map((t) => (
          <button key={t.id} className={`adm-chip ${tab === t.id ? 'on' : ''}`} onClick={() => go(t.id)} title={t.hint}>
            {t.label}<em>{grouped[t.id].length}</em>
          </button>
        ))}
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h2>{TABS.find((t) => t.id === tab).label}</h2>
          <input className="adm-input adm-search" style={{ height: 40 }} placeholder="Order ID, customer, city, pincode"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {loading ? (
          <div className="adm-spin-wrap" style={{ minHeight: 180 }}><div className="adm-spin" /></div>
        ) : shown.length === 0 ? (
          <div className="adm-empty">{q ? 'Koi order match nahi hua.' : `${TABS.find((t) => t.id === tab).hint}.`}</div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Delivery</th><th>Action</th></tr></thead>
              <tbody>
                {shown.map((o) => {
                  const partner = byId[o.delivery?.partner] || o.delivery?.partner;
                  const ds = o.delivery?.status;
                  return (
                    <tr key={o._id}>
                      <td>
                        <span className="adm-id">#{code(o)}</span>
                        <p className="adm-muted" style={{ margin: 0 }}>
                          {new Date(o.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </td>
                      <td>
                        <span className="adm-strong">{o.shippingInfo?.name}</span>
                        <p className="adm-muted" style={{ margin: 0 }}>{o.shippingInfo?.city}, {o.shippingInfo?.state} - {o.shippingInfo?.pincode}</p>
                      </td>
                      <td>
                        <span className="adm-strong">{formatPrice(o.totalPrice)}</span>{' '}
                        <span className={`adm-badge ${o.paymentMethod === 'COD' ? 'warn' : 'ok'}`}>{o.paymentMethod === 'COD' ? 'COD' : 'Prepaid'}</span>
                      </td>
                      <td>
                        {partner?.name ? (
                          <>
                            <span className="adm-strong">{partner.name}</span>{' '}
                            {ds && <span className={`adm-badge ${tone[ds] || 'gray'}`}>{ds}</span>}
                          </>
                        ) : <span className="adm-muted">Assign nahi hua</span>}
                        {ds === 'Failed' && <p className="adm-muted" style={{ margin: 0, color: '#d92d20' }}>Failed: {o.delivery?.failReason}</p>}
                      </td>
                      <td>
                        {tab === 'new' && (
                          <button className="adm-btn sm" disabled={busyId === o._id} onClick={() => confirm(o)}>
                            <HiOutlineCheckCircle /> {busyId === o._id ? 'Confirming...' : 'Confirm'}
                          </button>
                        )}
                        {(tab === 'ready' || tab === 'moving') && (
                          <button className={`adm-btn sm ${tab === 'moving' ? 'ghost' : ''}`} onClick={() => openAssign(o)}>
                            <HiOutlineTruck /> {tab === 'moving' || ds === 'Failed' ? 'Reassign' : 'Assign'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pick && (
        <div className="adm-modal-back" onClick={() => !saving && setPick(null)}>
          <div className="adm-modal" role="dialog" aria-label="Assign delivery partner" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => setPick(null)} aria-label="Close"><HiOutlineX /></button>
            <h2>Assign delivery partner</h2>
            <p className="adm-modal-sub">
              Order #{code(pick)} · {pick.shippingInfo?.name} · {pick.shippingInfo?.city} {pick.shippingInfo?.pincode} ·{' '}
              {pick.paymentMethod === 'COD' ? `COD ${formatPrice(pick.totalPrice)}` : 'Prepaid'}
            </p>
            {sortedPartners.length === 0 ? (
              <div className="adm-empty">Abhi koi active delivery partner nahi hai.</div>
            ) : sortedPartners.map((p) => (
              <button key={p._id} className={`mg-opt ${sel === p._id ? 'on' : ''}`} onClick={() => setSel(p._id)}>
                <span className="adm-avatar">{p.name.charAt(0).toUpperCase()}</span>
                <div>
                  <b>{p.name}</b>
                  <small>{p.vehicleType}{p.city ? ` · ${p.city}` : ''} · {p.phone}</small>
                </div>
                <div className="r">
                  <span className={`adm-badge ${p.isAvailable ? 'ok' : 'gray'}`}>{p.isAvailable ? 'Online' : 'Offline'}</span>
                  <small style={{ display: 'block', marginTop: 4 }}>{p.activeOrders} active</small>
                </div>
              </button>
            ))}
            <div className="adm-actions" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="adm-btn ghost" onClick={() => setPick(null)} disabled={saving}>Cancel</button>
              <button className="adm-btn" onClick={assign} disabled={!sel || saving}>{saving ? 'Assigning...' : 'Assign'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
