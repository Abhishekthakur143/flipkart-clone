import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineGift, HiOutlineDownload, HiOutlineUsers, HiOutlineSearch } from 'react-icons/hi';
import API from '../../utils/api';
import { formatPrice } from '../../utils/constants';
import GiftModal from '../../components/admin/GiftModal';
import '../../components/admin/admin.css';
import '../admin/growth.css';

const PERIODS = [
  ['daily', 'Today'],
  ['weekly', 'This week'],
  ['monthly', 'This month'],
  ['yearly', 'This year'],
  ['custom', 'Custom'],
];

// [label, field, isMoney]  +  idle(): us period me kuch kaam hua ya nahi
const TABS = {
  partners: {
    label: 'Delivery partners', type: 'delivery',
    cols: [['Delivered', 'deliveries'], ['Failed', 'failed'], ['Order value', 'orderValue', 1], ['Payout', 'payout', 1], ['Profit to company', 'companyMargin', 1]],
    idle: (r) => !(r.deliveries || r.failed),
  },
  managers: {
    label: 'Managers', type: 'manager',
    cols: [['Products added', 'productsAdded'], ['Orders handled', 'dealsHandled'], ['Units sold', 'unitsSold'], ['Confirmed', 'ordersConfirmed'], ['Profit to company', 'margin', 1]],
    idle: (r) => !(r.productsAdded || r.dealsHandled || r.ordersConfirmed),
  },
  sellers: {
    label: 'Sellers', type: 'seller',
    cols: [['Products added', 'productsAdded'], ['Units sold', 'unitsSold'], ['Seller earned', 'earned', 1], ['Seller profit', 'sellerProfit', 1], ['Profit to company', 'companyMargin', 1]],
    idle: (r) => !(r.productsAdded || r.unitsSold),
  },
  users: {
    label: 'Customers', type: 'user',
    cols: [['Orders', 'orders'], ['Total shopping', 'spent', 1]],
    idle: () => false,
  },
};

// Leader cards: [tab, heading, field, isMoney]
const LEADERS = [
  ['partners', 'Best delivery partner', 'deliveries', 0, 'deliveries'],
  ['managers', 'Best manager', 'margin', 1, 'profit'],
  ['sellers', 'Best seller', 'companyMargin', 1, 'profit'],
  ['users', 'Top customer', 'spent', 1, 'spent'],
];

const money = (n) => formatPrice(n || 0);
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const ist = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const today = () => ist(new Date());
const addDays = (s, n) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const dayDiff = (a, b) => Math.round((Date.UTC(...b.split('-').map((v, i) => (i === 1 ? v - 1 : +v))) - Date.UTC(...a.split('-').map((v, i) => (i === 1 ? v - 1 : +v)))) / 864e5);

// Pichle barabar ke period se compare (jaise is mahine ke 30 din vs pichle 30 din)
const Delta = ({ now, prev }) => {
  if (prev == null) return null;
  if (!prev) return now > 0 ? <small style={{ color: '#12b76a', fontWeight: 700 }}>New</small> : null;
  const pct = Math.round(((now - prev) / Math.abs(prev)) * 100);
  const up = pct >= 0;
  return <small style={{ color: up ? '#12b76a' : '#f04438', fontWeight: 700 }}>{up ? '▲' : '▼'} {Math.abs(pct)}%</small>;
};

const SuperAdminAnalytics = () => {
  const [period, setPeriod] = useState('monthly');
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [data, setData] = useState(null);
  const [prev, setPrev] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('partners');
  const [gift, setGift] = useState(null);
  const [q, setQ] = useState('');
  const [hideIdle, setHideIdle] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = period === 'custom' ? { from, to } : { period };
      const { data: d } = await API.get('/admin/analytics', { params });
      setData(d);

      // pichla period (best effort: fail ho to bas compare nahi dikhega)
      setPrev(null);
      try {
        const f = ist(d.from);
        const t = ist(d.to);
        const days = dayDiff(f, t) + 1;
        const pt = addDays(f, -1);
        const pf = addDays(pt, -(days - 1));
        const { data: p } = await API.get('/admin/analytics', { params: { from: pf, to: pt } });
        setPrev({ ...p.company, label: `${pf} – ${pt}`, days });
      } catch { /* ignore */ }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not load analytics');
    } finally {
      setLoading(false);
    }
  }, [period, from, to]);

  useEffect(() => { load(); }, [load]);

  const c = data?.company;
  const cur = TABS[tab];
  const maxProfit = Math.max(1, ...(data?.series || []).map((s) => s.profit));

  const rows = useMemo(() => {
    let list = data?.[tab] || [];
    if (hideIdle) list = list.filter((r) => !cur.idle(r));
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((r) => `${r.name} ${r.sub}`.toLowerCase().includes(s));
    return list;
  }, [data, tab, q, hideIdle, cur]);

  const idleCount = (k) => (data?.[k] || []).filter((r) => TABS[k].idle(r)).length;

  const exportCsv = () => {
    const head = ['Rank', 'Name', 'Detail', ...cur.cols.map(([l]) => l)];
    const lines = rows.map((r, i) => [i + 1, r.name, r.sub || '', ...cur.cols.map(([, k]) => r[k] || 0)]);
    const csv = [head, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${tab}-${ist(data.from)}_${ist(data.to)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const marginPct = c && c.revenue ? Math.round((c.margin / c.revenue) * 100) : 0;
  const costPct = c && c.margin ? Math.round((c.deliveryPayout / c.margin) * 100) : 0;
  const perOrder = c && c.deliveredOrders ? c.netProfit / c.deliveredOrders : 0;

  return (
    <div className="adm-stack">
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Analytics</h1>
          <p className="adm-sub">Poori company ka hisaab: kisne kitna kaam kiya, kisne kitna profit diya, aur kaun idle hai.</p>
          {data && <p className="gr-range">{fmt(data.from)} – {fmt(data.to)}</p>}
        </div>
        <div className="gr-head-actions">
          <Link to="/superadmin/accounts" className="adm-btn ghost"><HiOutlineUsers /> Accounts</Link>
          <Link to="/admin/rewards" className="adm-btn ghost"><HiOutlineGift /> Rewards &amp; gifts</Link>
        </div>
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
              <div className="adm-kpi"><small>Delivered orders</small><b>{c.deliveredOrders}</b><Delta now={c.deliveredOrders} prev={prev?.deliveredOrders} /></div>
              <div className="adm-kpi"><small>Delivered revenue</small><b>{money(c.revenue)}</b><Delta now={c.revenue} prev={prev?.revenue} /></div>
              <div className="adm-kpi"><small>Margin on seller products</small><b>{money(c.margin)}</b><Delta now={c.margin} prev={prev?.margin} /></div>
              <div className="adm-kpi"><small>Delivery payout (cost)</small><b>{money(c.deliveryPayout)}</b><Delta now={c.deliveryPayout} prev={prev?.deliveryPayout} /></div>
              <div className="adm-kpi"><small>Net profit</small><b>{money(c.netProfit)}</b><Delta now={c.netProfit} prev={prev?.netProfit} /></div>
              <div className="adm-kpi"><small>Orders placed / value</small><b>{c.placedOrders} · {money(c.placedValue)}</b><Delta now={c.placedValue} prev={prev?.placedValue} /></div>
            </div>
            {prev && <p className="gr-note">▲▼ pichle barabar ke period ({prev.days} din: {prev.label}) se compare hai.</p>}
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

          {/* ---- Super admin extras ---- */}
          <div className="adm-card">
            <div className="adm-card-head"><h2>Business health</h2></div>
            <div className="gr-kpis">
              <div className="adm-kpi"><small>Margin on revenue</small><b>{marginPct}%</b></div>
              <div className="adm-kpi"><small>Delivery cost / margin</small><b>{costPct}%</b></div>
              <div className="adm-kpi"><small>Net profit per order</small><b>{money(perOrder)}</b></div>
              <div className="adm-kpi"><small>Idle staff this period</small><b>{idleCount('partners') + idleCount('managers') + idleCount('sellers')}</b></div>
            </div>
            <div className="gr-kpis" style={{ paddingTop: 0 }}>
              {LEADERS.map(([k, label, field, isMoney]) => {
                const top = [...(data[k] || [])].sort((a, b) => (b[field] || 0) - (a[field] || 0))[0];
                const ok = top && (top[field] || 0) > 0;
                return (
                  <div className="adm-kpi" key={k}>
                    <small>{label}</small>
                    <b>{ok ? top.name : '-'}</b>
                    {ok && <small>{isMoney ? money(top[field]) : `${top[field]} ${field}`}</small>}
                    {ok && (
                      <button className="adm-btn sm ghost" style={{ marginTop: 6 }} onClick={() => setGift({ type: TABS[k].type, id: top.id, name: top.name })}>
                        <HiOutlineGift /> Gift
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="adm-chips">
              {Object.entries(TABS).map(([k, t]) => (
                <button key={k} className={`adm-chip ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{t.label}<em>{data[k]?.length || 0}</em></button>
              ))}
            </div>

            <div className="gr-dates">
              <div style={{ position: 'relative' }}>
                <HiOutlineSearch style={{ position: 'absolute', left: 12, top: 12, opacity: 0.5 }} />
                <input className="adm-input" style={{ paddingLeft: 34 }} placeholder="Search name / email" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              {tab !== 'users' && (
                <label className="adm-muted" style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={hideIdle} onChange={(e) => setHideIdle(e.target.checked)} /> Hide idle ({idleCount(tab)})
                </label>
              )}
              <button className="adm-btn sm ghost" onClick={exportCsv} disabled={!rows.length}><HiOutlineDownload /> Export CSV</button>
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
                          <td>
                            <span className="adm-strong">{r.name}</span>{' '}
                            {cur.idle(r) && <span className="adm-badge warn">Idle</span>}
                            <p className="adm-muted" style={{ margin: 0 }}>{r.sub}</p>
                          </td>
                          {cur.cols.map(([l, k, isMoney]) => (
                            <td key={l} className="gr-num" style={isMoney && (r[k] || 0) < 0 ? { color: '#f04438', fontWeight: 700 } : undefined}>
                              {isMoney ? money(r[k]) : (r[k] || 0)}
                            </td>
                          ))}
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

export default SuperAdminAnalytics;
