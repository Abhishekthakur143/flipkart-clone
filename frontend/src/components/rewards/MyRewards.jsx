import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineGift, HiOutlineRefresh } from 'react-icons/hi';
import { formatPrice } from '../../utils/constants';
import '../admin/admin.css';

// fetcher: async () => axiosResponse  (data: { rewards, targets, totals })
// Manager/seller: () => API.get('/manager/rewards')  |  delivery: apna delivery API instance
const METRIC = {
  spent: 'Total shopping', orders: 'Orders', deliveries: 'Deliveries', orderValue: 'Order value delivered',
  companyMargin: 'Profit to company', margin: 'Profit to company', productsAdded: 'Products added',
  unitsSold: 'Units sold', dealsHandled: 'Orders handled', sellerProfit: 'Your profit',
};
const MONEY = ['spent', 'orderValue', 'companyMargin', 'margin', 'sellerProfit'];
const GIFT = { bonus: 'Cash bonus', coupon: 'Coupon', points: 'Points', badge: 'Badge', commission: 'Commission discount', other: 'Surprise' };
const PERIOD = { daily: 'today', weekly: 'this week', monthly: 'this month', yearly: 'this year' };
const val = (m, n) => (MONEY.includes(m) ? formatPrice(n) : n);
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const MyRewards = ({ fetcher, title = 'My rewards' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetcher();
      setData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not load rewards');
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data) return <div className="adm-spin-wrap"><div className="adm-spin" /></div>;
  const d = data || { rewards: [], targets: [], totals: { count: 0, cash: 0 } };

  return (
    <div className="adm-stack">
      <div className="adm-head">
        <div>
          <h1 className="adm-title">{title}</h1>
          <p className="adm-sub">Achha kaam karne par mile gifts aur aapke aage ke targets.</p>
        </div>
        <button className="adm-btn ghost" onClick={load}><HiOutlineRefresh /> Refresh</button>
      </div>

      <div className="adm-kpis">
        <div className="adm-kpi"><small>Gifts received</small><b>{d.totals.count}</b></div>
        <div className="adm-kpi"><small>Cash bonus total</small><b>{formatPrice(d.totals.cash)}</b></div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head"><h2>Your targets</h2></div>
        <div style={{ padding: '18px 22px' }}>
          {d.targets.length === 0 ? <p className="adm-muted">No active targets right now.</p> : d.targets.map((t) => (
            <div key={t._id} style={{ marginBottom: 18 }}>
              <div className="adm-list-row" style={{ border: 0, padding: 0, marginBottom: 6 }}>
                <div className="adm-list-main">
                  <b>{METRIC[t.metric] || t.metric}: {val(t.metric, t.target)} {PERIOD[t.period]}</b>
                  <span>Gift: {t.giftTitle}{t.amount > 0 ? ` · ${formatPrice(t.amount)}` : ''}</span>
                </div>
                <div className="adm-list-end">
                  <span className={`adm-badge ${t.achieved ? 'ok' : 'info'}`}>{t.achieved ? 'Target reached' : 'In progress'}</span>
                </div>
              </div>
              <div className="adm-bar-row" style={{ gridTemplateColumns: '1fr auto' }}>
                <div className="adm-bar-track">
                  <div className="adm-bar-fill" style={{ width: `${Math.min(100, (t.current / t.target) * 100)}%`, background: t.achieved ? '#12b76a' : 'linear-gradient(90deg,#2874f0,#6a3df0)' }} />
                </div>
                <span className="adm-bar-val">{val(t.metric, t.current)} / {val(t.metric, t.target)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head"><h2><HiOutlineGift style={{ verticalAlign: '-3px' }} /> Gift history</h2></div>
        {d.rewards.length === 0 ? <div className="adm-empty">No gifts yet. Keep going!</div> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Date</th><th>Gift</th><th>Status</th></tr></thead>
              <tbody>
                {d.rewards.map((r) => (
                  <tr key={r._id}>
                    <td>{fmt(r.givenAt || r.createdAt)}</td>
                    <td>
                      <span className="adm-strong">{r.title}</span>
                      <p className="adm-muted" style={{ margin: 0 }}>
                        {GIFT[r.giftType]}{r.amount > 0 ? ` · ${formatPrice(r.amount)}` : ''}{r.couponCode ? ` · Code ${r.couponCode}` : ''}
                      </p>
                      {r.note && <p className="adm-muted" style={{ margin: 0 }}>{r.note}</p>}
                    </td>
                    <td><span className={`adm-badge ${r.status === 'Given' ? 'ok' : 'warn'}`}>{r.status === 'Given' ? 'Received' : 'Under review'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyRewards;
