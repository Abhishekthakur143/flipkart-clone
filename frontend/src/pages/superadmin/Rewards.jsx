import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineGift, HiOutlineLightningBolt, HiOutlineCog } from 'react-icons/hi';
import API from '../../utils/api';
import { formatPrice } from '../../utils/constants';
import GiftModal, { GIFT_TYPES } from '../../components/admin/GiftModal';
import '../../components/admin/admin.css';
import '../admin/growth.css';

const WHO = [
  ['', 'Everyone'],
  ['admin', 'Admins'],
  ['manager', 'Managers'],
  ['seller', 'Sellers'],
  ['delivery', 'Delivery partners'],
  ['user', 'Customers'],
];
const TONE = { Given: 'ok', Pending: 'warn', Rejected: 'bad' };
const who = (k) => (WHO.find(([x]) => x === k) || [])[1] || k;
const giftName = (k) => (GIFT_TYPES.find(([x]) => x === k) || [])[1] || k;
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const SuperRewards = () => {
  const [recipientType, setRecipientType] = useState('');
  const [status, setStatus] = useState('');
  const [rewards, setRewards] = useState([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | {} | { type }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (recipientType) params.recipientType = recipientType;
      if (status) params.status = status;
      const { data } = await API.get('/admin/rewards', { params });
      setRewards(data.rewards || []);
      setPending(data.pending || 0);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not load gifts');
    } finally {
      setLoading(false);
    }
  }, [recipientType, status]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn, okMsg) => {
    try {
      const { data } = await fn();
      toast.success(data.message || okMsg);
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Something went wrong'); }
  };

  const runNow = async () => {
    setBusy(true);
    await act(() => API.post('/admin/rewards/run'), 'Done');
    setBusy(false);
  };

  const given = rewards.filter((r) => r.status === 'Given');
  const cash = given.filter((r) => r.giftType === 'bonus').reduce((a, r) => a + (r.amount || 0), 0);

  return (
    <div className="adm-stack">
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Rewards (Super admin)</h1>
          <p className="adm-sub">Admin, manager, seller, delivery partner aur customer, sabko gift do. Auto gifts ko approve ya reject bhi yahin se karo.</p>
        </div>
        <div className="gr-head-actions">
          <Link to="/admin/rewards" className="adm-btn ghost"><HiOutlineCog /> Target rules</Link>
          <button className="adm-btn ghost" onClick={runNow} disabled={busy}><HiOutlineLightningBolt /> Run auto rewards now</button>
          <button className="adm-btn" onClick={() => setModal({})}><HiOutlineGift /> Give gift</button>
        </div>
      </div>

      <div className="adm-card">
        <div className="gr-kpis">
          <div className="adm-kpi"><small>Gifts shown</small><b>{rewards.length}</b></div>
          <div className="adm-kpi"><small>Given</small><b>{given.length}</b></div>
          <div className="adm-kpi"><small>Waiting for approval</small><b>{pending}</b></div>
          <div className="adm-kpi"><small>Cash bonus given</small><b>{formatPrice(cash)}</b></div>
        </div>
      </div>

      <div className="adm-chips" style={{ marginBottom: 0 }}>
        {WHO.map(([k, l]) => (
          <button key={k || 'all'} className={`adm-chip ${recipientType === k ? 'on' : ''}`} onClick={() => setRecipientType(k)}>{l}</button>
        ))}
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h2>Who got what</h2>
          <select className="adm-select adm-search" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 170 }}>
            <option value="">All</option><option value="Pending">Pending approval</option><option value="Given">Given</option><option value="Rejected">Rejected</option>
          </select>
        </div>
        {loading ? <div className="adm-spin-wrap"><div className="adm-spin" /></div> : rewards.length === 0 ? (
          <div className="adm-empty">No gifts yet. "Give gift" dabake pehla gift do.</div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Date</th><th>Recipient</th><th>Gift</th><th>How</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rewards.map((r) => (
                  <tr key={r._id}>
                    <td>{fmt(r.createdAt)}</td>
                    <td><span className="adm-strong">{r.recipientName}</span><p className="adm-muted" style={{ margin: 0 }}>{who(r.recipientType)}</p></td>
                    <td>
                      <span className="adm-strong">{r.title}</span>
                      <p className="adm-muted" style={{ margin: 0 }}>
                        {giftName(r.giftType)}{r.amount > 0 ? ` · ${formatPrice(r.amount)}` : ''}{r.couponCode ? ` · Code ${r.couponCode}` : ''}
                      </p>
                      {r.note && <p className="adm-muted" style={{ margin: 0 }}>{r.note}</p>}
                    </td>
                    <td><span className={`adm-badge ${r.source === 'auto' ? 'purple' : 'info'}`}>{r.source === 'auto' ? 'Auto' : 'Manual'}</span></td>
                    <td><span className={`adm-badge ${TONE[r.status]}`}>{r.status}</span></td>
                    <td>
                      {r.status === 'Pending' && (
                        <div className="adm-actions">
                          <button className="adm-btn sm" onClick={() => act(() => API.put(`/admin/rewards/${r._id}/approve`), 'Approved')}>Approve</button>
                          <button className="adm-del-text" onClick={() => act(() => API.put(`/admin/rewards/${r._id}/reject`), 'Rejected')}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && <GiftModal initial={modal} onClose={() => setModal(null)} onDone={load} />}
    </div>
  );
};

export default SuperRewards;
