import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineGift, HiOutlineLightningBolt } from 'react-icons/hi';
import API from '../../utils/api';
import { formatPrice } from '../../utils/constants';
import GiftModal, { GIFT_TYPES, RECIPIENTS } from '../../components/admin/GiftModal';
import '../../components/admin/admin.css';
import './growth.css';

const METRICS = {
  user: [['spent', 'Total shopping (₹)'], ['orders', 'Number of orders']],
  delivery: [['deliveries', 'Deliveries done'], ['orderValue', 'Order value delivered (₹)'], ['companyMargin', 'Profit to company (₹)']],
  manager: [['productsAdded', 'Products added'], ['unitsSold', 'Units sold'], ['margin', 'Profit to company (₹)'], ['dealsHandled', 'Orders handled']],
  seller: [['productsAdded', 'Products added'], ['unitsSold', 'Units sold'], ['companyMargin', 'Profit to company (₹)'], ['sellerProfit', 'Seller profit (₹)']],
};
const PERIODS = [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly']];
const STATUS_TONE = { Given: 'ok', Pending: 'warn', Rejected: 'bad' };
const label = (list, k) => (list.find(([x]) => x === k) || [])[1] || k;
const typeName = (k) => label(RECIPIENTS, k);
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const emptyRule = { recipientType: 'delivery', metric: 'deliveries', period: 'monthly', target: '', giftType: 'bonus', giftTitle: '', amount: '', autoGrant: 'false' };

const Rewards = () => {
  const [tab, setTab] = useState('history');
  const [status, setStatus] = useState('');
  const [rewards, setRewards] = useState([]);
  const [pending, setPending] = useState(0);
  const [rules, setRules] = useState([]);
  const [rule, setRule] = useState(emptyRule);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadRewards = useCallback(async () => {
    try {
      const { data } = await API.get('/admin/rewards', { params: status ? { status } : {} });
      setRewards(data.rewards || []);
      setPending(data.pending || 0);
    } catch (e) { toast.error(e.response?.data?.message || 'Could not load gifts'); }
  }, [status]);

  const loadRules = useCallback(async () => {
    try {
      const { data } = await API.get('/admin/rewards/rules');
      setRules(data.rules || []);
    } catch (e) { toast.error(e.response?.data?.message || 'Could not load rules'); }
  }, []);

  useEffect(() => { loadRewards(); }, [loadRewards]);
  useEffect(() => { loadRules(); }, [loadRules]);

  const act = async (fn, okMsg) => {
    try {
      const { data } = await fn();
      toast.success(data.message || okMsg);
      loadRewards(); loadRules();
    } catch (e) { toast.error(e.response?.data?.message || 'Something went wrong'); }
  };

  const runNow = async () => {
    setBusy(true);
    await act(() => API.post('/admin/rewards/run'), 'Done');
    setBusy(false);
  };

  const setR = (k) => (e) => {
    const v = e.target.value;
    setRule((s) => {
      const n = { ...s, [k]: v };
      if (k === 'recipientType') {
        n.metric = METRICS[v][0][0];
        if (v !== 'user' && n.giftType === 'coupon') n.giftType = 'bonus';
      }
      return n;
    });
  };

  const saveRule = async (e) => {
    e.preventDefault();
    await act(() => API.post('/admin/rewards/rules', rule), 'Rule saved');
    setRule(emptyRule);
  };

  const gifts = rule.recipientType === 'user' ? GIFT_TYPES : GIFT_TYPES.filter(([k]) => k !== 'coupon');

  return (
    <div className="adm-stack">
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Rewards &amp; Gifts</h1>
          <p className="adm-sub">Customers, delivery partners, managers aur sellers ko gift do: manually ya target pura hone par auto.</p>
        </div>
        <div className="gr-head-actions">
          <button className="adm-btn ghost" onClick={runNow} disabled={busy}><HiOutlineLightningBolt /> Run auto rewards now</button>
          <button className="adm-btn" onClick={() => setModal(true)}><HiOutlineGift /> Give gift</button>
        </div>
      </div>

      <div className="adm-chips" style={{ marginBottom: 0 }}>
        <button className={`adm-chip ${tab === 'history' ? 'on' : ''}`} onClick={() => setTab('history')}>Gift history{pending > 0 && <em>{pending} pending</em>}</button>
        <button className={`adm-chip ${tab === 'rules' ? 'on' : ''}`} onClick={() => setTab('rules')}>Target rules<em>{rules.length}</em></button>
      </div>

      {tab === 'history' && (
        <div className="adm-card">
          <div className="adm-card-head">
            <h2>Who got what</h2>
            <select className="adm-select adm-search" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 170 }}>
              <option value="">All</option><option value="Pending">Pending approval</option><option value="Given">Given</option><option value="Rejected">Rejected</option>
            </select>
          </div>
          {rewards.length === 0 ? <div className="adm-empty">No gifts yet.</div> : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th>Date</th><th>Recipient</th><th>Gift</th><th>How</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {rewards.map((r) => (
                    <tr key={r._id}>
                      <td>{fmt(r.createdAt)}</td>
                      <td><span className="adm-strong">{r.recipientName}</span><p className="adm-muted" style={{ margin: 0 }}>{typeName(r.recipientType)}</p></td>
                      <td>
                        <span className="adm-strong">{r.title}</span>
                        <p className="adm-muted" style={{ margin: 0 }}>
                          {label(GIFT_TYPES, r.giftType)}{r.amount > 0 ? ` · ${formatPrice(r.amount)}` : ''}{r.couponCode ? ` · Code ${r.couponCode}` : ''}
                        </p>
                        {r.note && <p className="adm-muted" style={{ margin: 0 }}>{r.note}</p>}
                      </td>
                      <td><span className={`adm-badge ${r.source === 'auto' ? 'purple' : 'info'}`}>{r.source === 'auto' ? 'Auto' : 'Manual'}</span></td>
                      <td><span className={`adm-badge ${STATUS_TONE[r.status]}`}>{r.status}</span></td>
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
      )}

      {tab === 'rules' && (
        <div className="adm-card">
          <form className="gr-rule-form adm-form" onSubmit={saveRule}>
            <h2 className="adm-card-title" style={{ margin: 0 }}>New target rule</h2>
            <div className="adm-row3">
              <div>
                <label className="adm-label">Who</label>
                <select className="adm-select" value={rule.recipientType} onChange={setR('recipientType')}>
                  {RECIPIENTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="adm-label">Target on</label>
                <select className="adm-select" value={rule.metric} onChange={setR('metric')}>
                  {METRICS[rule.recipientType].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="adm-label">Period</label>
                <select className="adm-select" value={rule.period} onChange={setR('period')}>
                  {PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="adm-row3">
              <div>
                <label className="adm-label">Target value</label>
                <input className="adm-input" type="number" min="1" value={rule.target} onChange={setR('target')} placeholder="e.g. 100" required />
              </div>
              <div>
                <label className="adm-label">Gift type</label>
                <select className="adm-select" value={rule.giftType} onChange={setR('giftType')}>
                  {gifts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="adm-label">Gift amount</label>
                <input className="adm-input" type="number" min="0" value={rule.amount} onChange={setR('amount')} placeholder="e.g. 500" />
              </div>
            </div>
            <div className="adm-row2">
              <div>
                <label className="adm-label">Gift title</label>
                <input className="adm-input" value={rule.giftTitle} onChange={setR('giftTitle')} placeholder="e.g. 100 deliveries bonus" maxLength={120} required />
              </div>
              <div>
                <label className="adm-label">When target is reached</label>
                <select className="adm-select" value={rule.autoGrant} onChange={setR('autoGrant')}>
                  <option value="false">Wait for my approval</option>
                  <option value="true">Give automatically</option>
                </select>
              </div>
            </div>
            <div><button className="adm-btn">Save rule</button></div>
          </form>

          {rules.length === 0 ? <div className="adm-empty">No rules yet. Add one above.</div> : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th>Rule</th><th>Target</th><th>Gift</th><th>Mode</th><th>Active</th><th /></tr></thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r._id}>
                      <td><span className="adm-strong">{typeName(r.recipientType)}</span><p className="adm-muted" style={{ margin: 0 }}>{r.name}</p></td>
                      <td>{label(METRICS[r.recipientType], r.metric)} ≥ {r.target} <span className="adm-muted">({r.period})</span></td>
                      <td>{label(GIFT_TYPES, r.giftType)}{r.amount > 0 ? ` · ${formatPrice(r.amount)}` : ''}</td>
                      <td><span className={`adm-badge ${r.autoGrant ? 'ok' : 'warn'}`}>{r.autoGrant ? 'Auto' : 'Approval'}</span></td>
                      <td>
                        <label className="adm-check" style={{ padding: '6px 12px' }}>
                          <input type="checkbox" checked={r.isActive} onChange={(e) => act(() => API.put(`/admin/rewards/rules/${r._id}`, { isActive: e.target.checked }), 'Updated')} />
                        </label>
                      </td>
                      <td><button className="adm-del-text" onClick={() => window.confirm('Delete this rule?') && act(() => API.delete(`/admin/rewards/rules/${r._id}`), 'Deleted')}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modal && <GiftModal initial={{}} onClose={() => setModal(false)} onDone={loadRewards} />}
    </div>
  );
};

export default Rewards;
