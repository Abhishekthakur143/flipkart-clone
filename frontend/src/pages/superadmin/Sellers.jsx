import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineRefresh, HiOutlineX } from 'react-icons/hi';
import API from '../../utils/api';
import { formatPrice } from '../../utils/constants';
import '../../components/admin/admin.css';
import '../../components/deals/deals.css';

const msg = (e, f = 'Something went wrong') => e?.response?.data?.message || f;
const TONE = { Invited: 'gray', Pending: 'warn', Verified: 'ok', Rejected: 'bad' };

// Super admin: sab sellers aur kisi ka bhi dashboard (sirf dekhna)
const Sellers = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [dash, setDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  const load = useCallback(async () => {
    try { setSellers((await API.get('/superadmin/sellers')).data.sellers || []); }
    catch (e) { toast.error(msg(e, 'Sellers load nahi hue')); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const view = async (s) => {
    setOpen(s); setDash(null); setDashLoading(true);
    try { setDash((await API.get(`/superadmin/sellers/${s.profile._id}/dashboard`)).data); }
    catch (e) { toast.error(msg(e, 'Dashboard load nahi hua')); }
    setDashLoading(false);
  };

  return (
    <div>
      <div className="adm-head">
        <div><h1 className="adm-title">Sellers</h1><p className="adm-sub">Har seller ka status aur uska dashboard dekho. Verify/deal ka kaam manager karta hai.</p></div>
        <button className="adm-btn ghost" onClick={() => { setLoading(true); load(); }}><HiOutlineRefresh /> Refresh</button>
      </div>
      {loading ? <div className="adm-spin-wrap" style={{ minHeight: 200 }}><div className="adm-spin" /></div> : (
        <div className="adm-card"><div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Seller</th><th>Shop</th><th>Status</th><th>Deals</th><th></th></tr></thead>
            <tbody>
              {sellers.map((s) => (
                <tr key={s.user._id}>
                  <td><span className="adm-strong">{s.user.name}</span><p className="adm-muted" style={{ margin: 0 }}>{s.user.email}</p></td>
                  <td>{s.profile.shopName || '—'}<p className="adm-muted" style={{ margin: 0 }}>{s.profile.city}</p></td>
                  <td><span className={`adm-badge ${TONE[s.profile.status]}`}>{s.profile.status}</span>{s.profile.trusted && <span className="dl-trusted" style={{ marginLeft: 6 }}>★ Trusted</span>}{!s.user.isActive && <span className="adm-badge bad" style={{ marginLeft: 6 }}>Disabled</span>}</td>
                  <td>{s.dealCount}{s.approvedDeals > 0 && <p className="adm-muted" style={{ margin: 0 }}>{s.approvedDeals} live</p>}</td>
                  <td><button className="adm-btn sm ghost" onClick={() => view(s)}>Dashboard</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {sellers.length === 0 && <div className="adm-empty">Abhi koi seller nahi hai.</div>}
        </div></div>
      )}

      {open && (
        <div className="adm-modal-back" onClick={() => setOpen(null)}>
          <div className="adm-modal dl-modal-wide" role="dialog" aria-label="Seller dashboard" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => setOpen(null)} aria-label="Close"><HiOutlineX /></button>
            <h2>{open.profile.shopName || open.user.name}</h2>
            <p className="adm-modal-sub">{open.user.email}{dash?.trusted ? ' · ★ Trusted' : ''}</p>
            {dashLoading && <div className="adm-spin-wrap" style={{ minHeight: 120 }}><div className="adm-spin" /></div>}
            {dash && (
              <>
                <div className="dl-money"><div><small>REVENUE (DELIVERED)</small><b>{formatPrice(dash.stats.revenue)}</b></div><div><small>PROFIT</small><b>{formatPrice(dash.stats.profit)}</b></div></div>
                <div className="dl-money" style={{ marginTop: 8 }}><div><small>UNITS SOLD</small><b>{dash.stats.soldUnits}</b></div><div><small>STOCK LEFT</small><b>{dash.stats.stockLeft}</b></div></div>
                <p className="dl-hint">On the way: {formatPrice(dash.stats.pendingRevenue)} · Deals: {dash.deals.open} open, {dash.deals.withAdmin} with admin, {dash.deals.approved} live</p>
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead><tr><th>Product</th><th>Rate</th><th>Stock</th><th>Sold</th><th>Earned</th></tr></thead>
                    <tbody>{dash.products.map((p) => <tr key={p._id}><td>{p.name}</td><td>{formatPrice(p.dealPrice)}</td><td>{p.stock}</td><td>{p.soldUnits}</td><td className="adm-strong">{formatPrice(p.earned)}</td></tr>)}</tbody>
                  </table>
                  {dash.products.length === 0 && <div className="adm-empty">Abhi koi product live nahi.</div>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sellers;
