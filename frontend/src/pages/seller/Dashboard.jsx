import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineCurrencyRupee, HiOutlineTrendingUp, HiOutlineShoppingBag, HiOutlineClock,
  HiOutlineCube, HiOutlineCollection, HiOutlineRefresh,
} from 'react-icons/hi';
import API from '../../utils/api';
import { formatPrice } from '../../utils/constants';
import '../../components/admin/admin.css';
import '../../components/deals/deals.css';

const Dashboard = () => {
  const { profile, reload } = useOutletContext();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

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
    { t: 'Total revenue', v: formatPrice(s.revenue), sub: 'Delivered orders ka paisa', i: HiOutlineCurrencyRupee, tone: 't-green' },
    { t: 'Profit', v: formatPrice(s.profit), sub: 'Aapke cost price ke hisaab se', i: HiOutlineTrendingUp, tone: 't-purple' },
    { t: 'Units sold', v: s.soldUnits, sub: `${s.pendingUnits} units raste me`, i: HiOutlineShoppingBag, tone: 't-blue' },
    { t: 'On the way', v: formatPrice(s.pendingRevenue), sub: 'Delivery ke baad milega', i: HiOutlineClock, tone: 't-yellow' },
    { t: 'Stock left', v: s.stockLeft, sub: `${s.unitsListed} units listed`, i: HiOutlineCube, tone: 't-orange' },
    { t: 'Open deals', v: data.deals.open, sub: `${data.deals.withAdmin} admin ke paas · ${data.deals.approved} live`, i: HiOutlineCollection, tone: 't-teal' },
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
          <div key={c.t} className="adm-stat" style={{ cursor: 'default' }}>
            <span className={`adm-stat-ico ${c.tone}`}><c.i /></span>
            <span><small>{c.t}</small><b>{c.v}</b><small style={{ marginTop: 2, fontSize: 12 }}>{c.sub}</small></span>
          </div>
        ))}
      </div>

      <div className="adm-card">
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
    </div>
  );
};

export default Dashboard;
