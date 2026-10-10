import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineClipboardList, HiOutlineCheckCircle, HiOutlineCash, HiOutlineTrendingUp, HiOutlineSearch,
  HiOutlineInbox, HiOutlineTruck, HiOutlineChevronRight,
} from 'react-icons/hi';
import { dv, errMsg } from './deliveryApi';
import { Badge, Empty, Skeleton, StatCard, WeeklyChart, inr, fmtTime, addressLine } from './ui';

/* ---------- one order row ---------- */
export const OrderRow = ({ o, onOpen }) => (
  <button className="dv-order" onClick={() => onOpen(o._id)}>
    <img src={o.items[0]?.image} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
    <div style={{ minWidth: 0 }}>
      <div className="t">
        <span className="code">#{o.code}</span>
        {o.paymentMethod === 'COD' ? <span className="dv-pill cod">COD {inr(o.totalPrice)}</span> : <span className="dv-pill">Prepaid</span>}
      </div>
      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{o.shippingInfo.name}</p>
      <p className="addr">{addressLine(o.shippingInfo)}</p>
    </div>
    <div className="r">
      <Badge status={o.delivery.status} />
      <span className="when">
        {o.delivery.status === 'Delivered' ? `+${inr(o.delivery.payout)}` : fmtTime(o.delivery.assignedAt)}
      </span>
      <HiOutlineChevronRight style={{ color: 'var(--dv-muted)' }} />
    </div>
  </button>
);

/* ---------- Overview ---------- */
export const Overview = ({ stats, active, loading, onOpen, goOrders, partner }) => {
  if (loading || !stats) return <><div className="dv-grid4"><Skeleton h={96} n={4} /></div><Skeleton h={260} n={1} /></>;
  const { today, totals } = stats;
  const up = active.slice(0, 3);
  return (
    <>
      <div className="dv-grid4">
        <StatCard icon={HiOutlineCheckCircle} tone="green" label="Delivered today" value={today.delivered}
          hint={today.failed ? `${today.failed} failed` : 'Keep it up!'} />
        <StatCard icon={HiOutlineClipboardList} tone="blue" label="Active orders" value={totals.active} hint={`${today.assigned} assigned today`} />
        <StatCard icon={HiOutlineCash} tone="amber" label="Today's earnings" value={inr(today.earnings)} hint={`${inr(stats.payoutPerDelivery)} per delivery`} />
        <StatCard icon={HiOutlineTrendingUp} tone="violet" label="Success rate" value={`${totals.successRate}%`} hint={`${totals.delivered} delivered all time`} />
      </div>

      <div className="dv-grid2">
        <div className="dv-card"><WeeklyChart data={stats.weekly} /></div>
        <div className="dv-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4>Up next</h4>
            {active.length > 3 && <button className="dv-textlink" onClick={goOrders}>View all ({active.length})</button>}
          </div>
          {up.length === 0 ? (
            <Empty icon={HiOutlineInbox} title="No active orders"
              text={partner.isAvailable ? 'New orders assigned to you will show up here.' : 'You are offline. Go online to receive orders.'} />
          ) : (
            <div className="dv-list">{up.map((o) => <OrderRow key={o._id} o={o} onOpen={onOpen} />)}</div>
          )}
        </div>
      </div>

      <div className="dv-card">
        <h4 style={{ marginBottom: 14 }}>All-time summary</h4>
        <div className="dv-minis" style={{ marginTop: 0 }}>
          <div className="dv-mini"><small>Total deliveries</small><b>{totals.delivered}</b></div>
          <div className="dv-mini"><small>Total earnings</small><b>{inr(totals.earnings)}</b></div>
          <div className="dv-mini"><small>Cash collected (COD)</small><b>{inr(totals.codCollected)}</b></div>
        </div>
      </div>
    </>
  );
};

/* ---------- Orders (active / completed + search) ---------- */
export const OrdersSection = ({ active, completed, loading, onOpen }) => {
  const [tab, setTab] = useState('active');
  const [q, setQ] = useState('');
  const list = tab === 'active' ? active : completed;
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((o) =>
      o.code.toLowerCase().includes(t) ||
      o.shippingInfo.name.toLowerCase().includes(t) ||
      String(o.shippingInfo.pincode).includes(t) ||
      addressLine(o.shippingInfo).toLowerCase().includes(t));
  }, [list, q]);

  return (
    <>
      <div className="dv-toolbar">
        <div className="dv-seg">
          <button className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>Active ({active.length})</button>
          <button className={tab === 'completed' ? 'on' : ''} onClick={() => setTab('completed')}>Completed ({completed.length})</button>
        </div>
        <label className="dv-search">
          <HiOutlineSearch />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by order ID, name, pincode or area" />
        </label>
      </div>
      {loading ? <Skeleton /> : shown.length === 0 ? (
        <Empty icon={tab === 'active' ? HiOutlineTruck : HiOutlineInbox}
          title={q ? 'No matching orders' : tab === 'active' ? 'No active orders' : 'Nothing completed yet'}
          text={q ? 'Try a different search.' : tab === 'active' ? 'Orders assigned to you will appear here.' : 'Delivered and failed orders will be listed here.'} />
      ) : (
        <div className="dv-list">{shown.map((o) => <OrderRow key={o._id} o={o} onOpen={onOpen} />)}</div>
      )}
    </>
  );
};

/* ---------- Earnings ---------- */
export const EarningsSection = ({ stats, completed, loading }) => {
  if (loading || !stats) return <Skeleton h={220} n={2} />;
  const { totals, today } = stats;
  const week = stats.weekly.reduce((n, d) => n + d.earnings, 0);
  const paid = completed.filter((o) => o.delivery.status === 'Delivered');
  return (
    <>
      <div className="dv-grid2">
        <div className="dv-card">
          <p style={{ color: 'var(--dv-muted)', fontWeight: 700, fontSize: 13 }}>TOTAL EARNINGS</p>
          <div className="dv-big">{inr(totals.earnings)}</div>
          <div className="dv-minis">
            <div className="dv-mini"><small>Today</small><b>{inr(today.earnings)}</b></div>
            <div className="dv-mini"><small>Last 7 days</small><b>{inr(week)}</b></div>
            <div className="dv-mini"><small>This month</small><b>{inr(totals.monthEarnings)}</b></div>
          </div>
        </div>
        <div className="dv-card" style={{ display: 'grid', placeItems: 'center', gap: 12, textAlign: 'center' }}>
          <div className="dv-ring" style={{ '--p': totals.successRate }}><span>{totals.successRate}%</span></div>
          <div><h4>Success rate</h4><p className="dv-note">{totals.delivered} delivered · {totals.failed} failed</p></div>
        </div>
      </div>
      <div className="dv-card" style={{ marginBottom: 18 }}><WeeklyChart data={stats.weekly} /></div>
      <div className="dv-card">
        <h4 style={{ marginBottom: 14 }}>Delivery history</h4>
        {paid.length === 0 ? (
          <Empty icon={HiOutlineCash} title="No earnings yet" text="Complete your first delivery to start earning." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dv-table">
              <thead><tr><th>Order</th><th>Delivered</th><th>Payment</th><th className="n">Cash collected</th><th className="n">Earned</th></tr></thead>
              <tbody>
                {paid.map((o) => (
                  <tr key={o._id}>
                    <td><b>#{o.code}</b></td>
                    <td>{fmtTime(o.delivery.deliveredAt)}</td>
                    <td>{o.paymentMethod === 'COD' ? 'COD' : 'Prepaid'}</td>
                    <td className="n">{o.delivery.codCollected ? inr(o.delivery.codCollected) : '-'}</td>
                    <td className="n" style={{ color: 'var(--dv-accent)', fontWeight: 800 }}>+{inr(o.delivery.payout)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

/* ---------- Profile ---------- */
export const ProfileSection = ({ partner, onSaved }) => {
  const [f, setF] = useState({
    name: partner.name, phone: partner.phone, city: partner.city || '',
    vehicleType: partner.vehicleType, vehicleNumber: partner.vehicleNumber || '',
  });
  const [pw, setPw] = useState({ oldPassword: '', newPassword: '' });
  const [busy, setBusy] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy('save');
    try { const r = await dv.updateMe(f); toast.success(r.message); onSaved(r.partner); }
    catch (err) { toast.error(errMsg(err)); }
    setBusy('');
  };
  const changePw = async (e) => {
    e.preventDefault();
    setBusy('pw');
    try { const r = await dv.updatePassword(pw); toast.success(r.message); setPw({ oldPassword: '', newPassword: '' }); }
    catch (err) { toast.error(errMsg(err)); }
    setBusy('');
  };

  return (
    <div className="dv-grid2" style={{ gridTemplateColumns: '1.3fr 1fr', alignItems: 'start' }}>
      <form className="dv-card dv-form" onSubmit={save}>
        <h4>Profile & vehicle</h4>
        <div className="dv-field"><label>Email</label><input className="dv-input" value={partner.email} disabled /></div>
        <div className="dv-row2">
          <div className="dv-field"><label>Name</label><input className="dv-input" required value={f.name} onChange={set('name')} /></div>
          <div className="dv-field"><label>Mobile</label>
            <input className="dv-input" required maxLength={10} pattern="[6-9][0-9]{9}" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '') })} />
          </div>
        </div>
        <div className="dv-row2">
          <div className="dv-field"><label>City</label><input className="dv-input" value={f.city} onChange={set('city')} /></div>
          <div className="dv-field"><label>Vehicle</label>
            <select className="dv-input" value={f.vehicleType} onChange={set('vehicleType')}>
              {['Bike', 'Scooter', 'Cycle', 'EV'].map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="dv-field"><label>Vehicle number</label><input className="dv-input" value={f.vehicleNumber} onChange={set('vehicleNumber')} /></div>
        <button className="dv-btn" disabled={busy === 'save'}>{busy === 'save' && <span className="dv-spin" />}Save changes</button>
      </form>

      <form className="dv-card dv-form" onSubmit={changePw}>
        <h4>Change password</h4>
        <div className="dv-field"><label>Current password</label>
          <input className="dv-input" type="password" required autoComplete="current-password" value={pw.oldPassword} onChange={(e) => setPw({ ...pw, oldPassword: e.target.value })} /></div>
        <div className="dv-field"><label>New password</label>
          <input className="dv-input" type="password" required minLength={6} autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></div>
        <button className="dv-btn blue" disabled={busy === 'pw'}>{busy === 'pw' && <span className="dv-spin" />}Update password</button>
      </form>
    </div>
  );
};
