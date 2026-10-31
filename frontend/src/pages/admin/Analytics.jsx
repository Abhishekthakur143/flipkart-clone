import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineGift } from 'react-icons/hi';
import API from '../../utils/api';
import { formatPrice } from '../../utils/constants';
import GiftModal from '../../components/admin/GiftModal';
import '../../components/admin/admin.css';
import './growth.css';

const PERIODS = [
  ['daily', 'Today'],
  ['weekly', 'This week'],
  ['monthly', 'This month'],
  ['yearly', 'This year'],
  ['custom', 'Custom'],
];

// [label, field, isMoney]
const TABS = {
  partners: {
    label: 'Delivery partners', type: 'delivery',
    cols: [['Delivered', 'deliveries'], ['Failed', 'failed'], ['Order value', 'orderValue', 1], ['Payout', 'payout', 1], ['Profit to company', 'companyMargin', 1]],
  },
  managers: {
    label: 'Managers', type: 'manager',
    cols: [['Products added', 'productsAdded'], ['Orders handled', 'dealsHandled'], ['Units sold', 'unitsSold'], ['Confirmed', 'ordersConfirmed'], ['Profit to company', 'margin', 1]],
  },
  sellers: {
    label: 'Sellers', type: 'seller',
    cols: [['Products added', 'productsAdded'], ['Units sold', 'unitsSold'], ['Seller earned', 'earned', 1], ['Seller profit', 'sellerProfit', 1], ['Profit to company', 'companyMargin', 1]],
  },
  users: {
    label: 'Customers', type: 'user',
    cols: [['Orders', 'orders'], ['Total shopping', 'spent', 1]],
  },
};

const money = (n) => formatPrice(n || 0);
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const Analytics = () => {
  const [period, setPeriod] = useState('monthly');
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('partners');
  const [gift, setGift] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = period === 'custom' ? { from, to } : { period };
      const { data: d } = await API.get('/admin/analytics', { params });
      setData(d);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not load analytics');
    } finally {
      setLoading(false);
    }
  }, [period, from, to]);

  useEffect(() => { load(); }, [load]);

  const c = data?.company;
  const cur = TABS[tab];
  const rows = data?.[tab] || [];
  const maxProfit = Math.max(1, ...(data?.series || []).map((s) => s.profit));

  return (
    <div className="adm-stack">
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Analytics</h1>
          <p className="adm-sub">Kisne kitna kaam kiya aur company ko kitna profit diya.</p>
          {data && <p className="gr-range">{fmt(data.from)} – {fmt(data.to)}</p>}
        </div>
        <Link to="/admin/rewards" className="adm-btn ghost"><HiOutlineGift /> Rewards &amp; gifts</Link>
      </div>

      <div>
        <div className="adm-chips">
          {PERIODS.map(([k, l]) => (
            <button key={k} className={`adm-chip ${period === k ? 'on' : ''}`} onClick={() => setPeriod(k)}>{l}</button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="gr-dates">
            <input className="adm-input" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            <span className="adm-muted">to</span>
            <input className="adm-input" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
        )}
      </div>

      {loading && !data ? (
        <div className="adm-spin-wrap"><div className="adm-spin" /></div>
      ) : data && (
        <>
          <div className="adm-card">
            <div className="adm-card-head"><h2>Company (Flipkart clone)</h2></div>
            <div className="gr-kpis">
              <div className="adm-kpi"><small>Delivered orders</small><b>{c.deliveredOrders}</b></div>
              <div className="adm-kpi"><small>Delivered revenue</small><b>{money(c.revenue)}</b></div>
              <div className="adm-kpi"><small>Margin on seller products</small><b>{money(c.margin)}</b></div>
              <div className="adm-kpi"><small>Delivery payout (cost)</small><b>{money(c.deliveryPayout)}</b></div>
              <div className="adm-kpi"><small>Net profit</small><b>{money(c.netProfit)}</b></div>
              <div className="adm-kpi"><small>Orders placed / value</small><b>{c.placedOrders} · {money(c.placedValue)}</b></div>
            </div>
            {c.ownRevenue > 0 && (
              <div className="gr-note">
                {money(c.ownRevenue)} ki sale store ke apne products (bina seller) se hui. Unka cost price system me nahi hai, isliye wo profit me nahi ginti.
              </div>
            )}
            <div className="gr-bars">
              <div className="adm-label">Net profit trend</div>
              {data.series.length === 0 ? <p className="adm-muted">No delivered orders in this period.</p> : data.series.map((s) => (
                <div className="adm-bar-row" key={s.label}>
                  <span className="adm-bar-label">{s.label}</span>
                  <div className="adm-bar-track"><div className="adm-bar-fill" style={{ width: `${(Math.max(0, s.profit) / maxProfit) * 100}%`, background: 'linear-gradient(90deg,#12b76a,#2874f0)' }} /></div>
                  <span className="adm-bar-val">{money(s.profit)} · {s.orders}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="adm-chips">
              {Object.entries(TABS).map(([k, t]) => (
                <button key={k} className={`adm-chip ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{t.label}<em>{data[k]?.length || 0}</em></button>
              ))}
            </div>
            <div className="adm-card">
              {rows.length === 0 ? <div className="adm-empty">No data for this period.</div> : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Name</th>
                        {cur.cols.map(([l]) => <th key={l} className="gr-num">{l}</th>)}
                        <th>Gift</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.id}>
                          <td><span className={`gr-rank ${i < 3 ? 'top' : ''}`}>{i + 1}</span></td>
                          <td><span className="adm-strong">{r.name}</span><p className="adm-muted" style={{ margin: 0 }}>{r.sub}</p></td>
                          {cur.cols.map(([l, k, isMoney]) => <td key={l} className="gr-num">{isMoney ? money(r[k]) : (r[k] || 0)}</td>)}
                          <td>
                            <button className="adm-btn sm ghost" onClick={() => setGift({ type: cur.type, id: r.id, name: r.name })}><HiOutlineGift /> Gift</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {gift && <GiftModal initial={gift} onClose={() => setGift(null)} />}
    </div>
  );
};

export default Analytics;
