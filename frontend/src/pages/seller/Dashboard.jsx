import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineCurrencyRupee, HiOutlineTrendingUp, HiOutlineShoppingBag, HiOutlineClock,
  HiOutlineCube, HiOutlineCollection, HiOutlineRefresh,
} from 'react-icons/hi';
import API from '../../utils/api';
import StatDetail from '../../components/StatDetail';
import { formatPrice } from '../../utils/constants';
import '../../components/admin/admin.css';
import '../../components/deals/deals.css';
 
const Dashboard = () => {
  const { profile, reload } = useOutletContext();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const tableRef = useRef(null);
  const [detail, setDetail] = useState(null); // 'revenue' | 'profit' | 'sold' | 'way' | 'stock' | 'deals'
  const [openDeals, setOpenDeals] = useState(null);
  const show = (k) => {
    setDetail(k);
    if (k === 'deals' && !openDeals) {
      API.get('/deals/seller').then((r) => setOpenDeals((r.data.deals || []).filter((d) => ['Proposed', 'Countered', 'Agreed', 'PendingAdmin'].includes(d.status)))).catch(() => { setOpenDeals([]); toast.error('Deals load nahi hue'); });
    }
  };
 
  const load = useCallback(async () => {
    setError('');
    try {
      const r = await API.get('/seller/dashboard');
      setData(r.data);
      if (r.data.trusted !== profile.trusted) reload();
    } catch (e) {
      const m = e.response?.data?.message || 'Could not load the dashboard';
      setError(m); toast.error(m);
    }
  }, [profile.trusted, reload]);
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
 
  if (error && !data) return <div className="adm-card adm-pad"><p className="adm-sub" style={{ marginBottom: 14 }}>{error}</p><button className="adm-btn" onClick={load}><HiOutlineRefresh /> Try again</button></div>;
  if (!data) return <div className="adm-spin-wrap"><div className="adm-spin" /></div>;
 
  const s = data.stats;
  const cards = [
    { t: 'Total revenue', v: formatPrice(s.revenue), sub: 'Delivered orders ka paisa', i: HiOutlineCurrencyRupee, tone: 't-green', act: () => show('revenue') },
    { t: 'Profit', v: formatPrice(s.profit), sub: 'Aapke cost price ke hisaab se', i: HiOutlineTrendingUp, tone: 't-purple', act: () => show('profit') },
    { t: 'Units sold', v: s.soldUnits, sub: `${s.pendingUnits} units raste me`, i: HiOutlineShoppingBag, tone: 't-blue', act: () => show('sold') },
    { t: 'On the way', v: formatPrice(s.pendingRevenue), sub: 'Delivery ke baad milega', i: HiOutlineClock, tone: 't-yellow', act: () => show('way') },
    { t: 'Stock left', v: s.stockLeft, sub: `${s.unitsListed} units listed`, i: HiOutlineCube, tone: 't-orange', act: () => show('stock') },
    { t: 'Open deals', v: data.deals.open, sub: `${data.deals.withAdmin} admin ke paas · ${data.deals.approved} live`, i: HiOutlineCollection, tone: 't-teal', act: () => show('deals') },
  ];
 
  return (
    <div className="adm-stack">
      <div className="adm-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="adm-title">Seller Dashboard {data.trusted && <span className="dl-trusted" style={{ verticalAlign: 'middle' }}>★ Trusted seller</span>}</h1>
          <p className="adm-sub">Aapka maal bikne par hi paisa milta hai (consignment). Hisaab Delivered orders se banta hai.</p>
        </div>
        <button className="adm-btn ghost" onClick={load}><HiOutlineRefresh /> Refresh</button>
      </div>
 
      {data.status !== 'Verified' && (
        <div className={`dl-banner ${data.status === 'Rejected' ? 'bad' : 'warn'}`} role="status">
          <div>
            <b>{data.status === 'Pending' ? 'Verification chal rahi hai' : 'Pehle verification poori karo'}</b>
            {data.status === 'Pending' ? 'Manager aapki shop details dekh raha hai. Verify hote hi aap items bhej sakoge.' : <>Items bhejne se pehle shop ki details bharni hain. <Link to="/seller/verification" style={{ fontWeight: 700 }}>Form kholo →</Link></>}
          </div>
        </div>
      )}
 
      <div className="adm-stats">
        {cards.map((c) => (
          <div key={c.t} className="adm-stat" style={{ cursor: 'pointer' }} role="button" tabIndex={0}
            onClick={c.act} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), c.act())}>
            <span className={`adm-stat-ico ${c.tone}`}><c.i /></span>
            <span><small>{c.t}</small><b>{c.v}</b><small style={{ marginTop: 2, fontSize: 12 }}>{c.sub}</small></span>
          </div>
        ))}
      </div>
 
      <div className="adm-card" ref={tableRef} style={{ scrollMarginTop: 80 }}>
        <div className="adm-card-head"><h2>Your products</h2><Link className="adm-link-sm" to="/seller/deals">Items & deals</Link></div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Product</th><th>Your rate</th><th>Listed</th><th>Stock</th><th>Sold</th><th>Earned</th><th>Profit</th></tr></thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p._id}>
                  <td><div className="adm-prod">{p.image ? <img src={p.image} alt="" /> : <span style={{ width: 48 }} />}<span>{p.name}</span></div></td>
                  <td>{formatPrice(p.dealPrice)}<p className="adm-muted" style={{ margin: 0 }}>cost {p.costPrice == null ? '—' : formatPrice(p.costPrice)}</p></td>
                  <td>{p.listed}</td>
                  <td>{p.stock}</td>
                  <td>{p.soldUnits}{p.pendingUnits > 0 && <p className="adm-muted" style={{ margin: 0 }}>+{p.pendingUnits} raste me</p>}</td>
                  <td className="adm-strong">{formatPrice(p.earned)}</td>
                  <td className="adm-strong">{p.profit == null ? '—' : formatPrice(p.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.products.length === 0 && <div className="adm-empty">Abhi koi product live nahi hai. Admin ke approve karte hi yahan dikhega.</div>}
        </div>
      </div>
 
      {detail && (() => {
        const P = data.products;
        const money = formatPrice;
        const base = { onClose: () => setDetail(null) };
        if (detail === 'revenue') {
          const r = P.filter((p) => p.soldUnits > 0);
          return <StatDetail {...base} title="Total revenue" note="Sirf Delivered orders ginte hain. Paisa = delivered units × aapka rate."
            cols={['Product', 'Delivered units', 'Your rate', 'Earned']} rows={r.map((p) => [p.name, p.soldUnits, money(p.dealPrice), money(p.earned)])}
            foot={['Total', s.soldUnits, '', money(s.revenue)]} empty="Abhi koi order deliver nahi hua, isliye revenue 0 hai." />;
        }
        if (detail === 'profit') {
          const r = P.filter((p) => p.soldUnits > 0);
          return <StatDetail {...base} title="Profit" note="Profit = delivered units × (aapka rate − aapki cost)."
            cols={['Product', 'Sold', 'Your rate', 'Your cost', 'Profit']} rows={r.map((p) => [p.name, p.soldUnits, money(p.dealPrice), p.costPrice == null ? '—' : money(p.costPrice), p.profit == null ? '—' : money(p.profit)])}
            foot={['Total', s.soldUnits, '', '', money(s.profit)]} empty="Abhi koi sale nahi hui, isliye profit 0 hai." />;
        }
        if (detail === 'sold') {
          return <StatDetail {...base} title="Units sold" note="Delivered = bik chuke. On the way = customer ne order kiya, abhi pahunch nahi."
            cols={['Product', 'Listed', 'On the way', 'Delivered']} rows={P.map((p) => [p.name, p.listed, p.pendingUnits, p.soldUnits])}
            foot={['Total', s.unitsListed, s.pendingUnits, s.soldUnits]} empty="Abhi koi product live nahi hai." />;
        }
        if (detail === 'way') {
          const r = P.filter((p) => p.pendingUnits > 0);
          return <StatDetail {...base} title="On the way" note="Ye orders abhi deliver nahi hue. Delivery hote hi paisa revenue me judega."
            cols={['Product', 'Units on the way', 'Your rate', 'Will earn']} rows={r.map((p) => [p.name, p.pendingUnits, money(p.dealPrice), money(p.pendingUnits * p.dealPrice)])}
            foot={['Total', s.pendingUnits, '', money(s.pendingRevenue)]} empty="Abhi koi order raste me nahi hai." />;
        }
        if (detail === 'stock') {
          return <StatDetail {...base} title="Stock left" note="Store me abhi kitna maal bacha hai."
            cols={['Product', 'Listed', 'Sold', 'Stock left']} rows={P.map((p) => [p.name, p.listed, p.soldUnits + p.pendingUnits, p.stock])}
            foot={['Total', s.unitsListed, s.soldUnits + s.pendingUnits, s.stockLeft]} empty="Abhi koi product live nahi hai." />;
        }
        return (
          <StatDetail {...base} title="Open deals" note="Jin items par baat chal rahi hai ya admin ka jawab baaki hai."
            cols={['Item', 'Qty', 'Your ask', 'Status']} rows={openDeals ? openDeals.map((d) => [d.productName, d.quantity, money(d.askPrice), d.status === 'PendingAdmin' ? 'With admin' : d.status === 'Countered' ? 'Your reply needed' : d.status === 'Agreed' ? 'Rate agreed' : 'Manager reply pending']) : undefined}
            empty="Koi deal open nahi hai.">
            {!openDeals && <div className="adm-spin-wrap" style={{ minHeight: 100 }}><div className="adm-spin" /></div>}
            <div className="adm-actions" style={{ marginTop: 14 }}><button className="adm-btn" onClick={() => navigate('/seller/deals')}>Open Items & deals</button></div>
          </StatDetail>
        );
      })()}
    </div>
  );
};
 
export default Dashboard;