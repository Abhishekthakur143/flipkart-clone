import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineRefresh, HiOutlineExternalLink } from 'react-icons/hi';
import API from '../../utils/api';
import { tokenStore } from '../../delivery/deliveryApi';
import '../../components/admin/admin.css';
import '../../components/deals/deals.css';

const msg = (e, f = 'Something went wrong') => e?.response?.data?.message || f;
export const VIEW_AS_KEY = 'deliveryViewAs';

// Super admin: kisi bhi delivery partner ka poora dashboard (usi ki tarah) kholo
const DeliveryPartners = () => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try { setPartners((await API.get('/superadmin/delivery-partners')).data.partners || []); }
    catch (e) { toast.error(msg(e, 'Partners load nahi hue')); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = async (p) => {
    setBusy(p._id);
    try {
      const { data } = await API.post(`/superadmin/delivery-partners/${p._id}/open`);
      tokenStore.set(data.token);
      try { localStorage.setItem(VIEW_AS_KEY, JSON.stringify({ name: data.partner.name, token: data.token })); } catch { /* ignore */ }
      navigate('/delivery');
    } catch (e) { toast.error(msg(e, 'Partner app nahi khul paya')); }
    setBusy('');
  };

  return (
    <div>
      <div className="adm-head">
        <div><h1 className="adm-title">Delivery partner app</h1><p className="adm-sub">Kisi bhi partner par "Open app" dabao, uska poora dashboard usi ki tarah khulega (2 ghante tak). Aapka har kaam activity log me likha jata hai.</p></div>
        <button className="adm-btn ghost" onClick={() => { setLoading(true); load(); }}><HiOutlineRefresh /> Refresh</button>
      </div>
      {loading ? <div className="adm-spin-wrap" style={{ minHeight: 200 }}><div className="adm-spin" /></div> : (
        <div className="adm-card"><div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Partner</th><th>Vehicle</th><th>City</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p._id}>
                  <td><span className="adm-strong">{p.name}</span><p className="adm-muted" style={{ margin: 0 }}>{p.email} · {p.phone}</p></td>
                  <td>{p.vehicleType}{p.vehicleNumber ? ` · ${p.vehicleNumber}` : ''}</td>
                  <td>{p.city || '—'}</td>
                  <td>
                    {p.isActive === false ? <span className="adm-badge bad">Disabled</span> : <span className={`adm-badge ${p.isAvailable ? 'ok' : 'gray'}`}>{p.isAvailable ? 'Online' : 'Offline'}</span>}
                  </td>
                  <td>
                    <button className="adm-btn sm" disabled={p.isActive === false || busy === p._id} onClick={() => open(p)}>
                      <HiOutlineExternalLink /> {busy === p._id ? 'Opening...' : 'Open app'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {partners.length === 0 && <div className="adm-empty">Abhi koi delivery partner nahi hai.</div>}
        </div></div>
      )}
    </div>
  );
};

export default DeliveryPartners;
