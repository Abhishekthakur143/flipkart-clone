import { useEffect, useState } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  HiOutlineKey, HiOutlineTrash, HiOutlineBan,
  HiOutlineCheckCircle, HiOutlineClipboardCopy, HiOutlineX, HiOutlineBadgeCheck,
} from 'react-icons/hi';
import '../../components/admin/admin.css';

const BASE = '/delivery/admin/partners';
// Naya partner ab yahan se nahi banta: manager add karta hai / applicant apply karta hai, admin /admin/approvals me yes-no bolta hai.

const copy = (text) => {
  navigator.clipboard.writeText(text).then(() => toast.success('Copied'), () => toast.error('Copy nahi hua'));
};

const CredModal = ({ creds, onClose }) => (
  <div className="adm-modal-back" onClick={onClose}>
    <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
      <button className="adm-modal-x" onClick={onClose} aria-label="Close"><HiOutlineX /></button>
      <h2>{creds.title}</h2>
      <p className="adm-modal-sub">Ye email aur password delivery boy ko de do. Password sirf abhi dikh raha hai, baad me dobara nahi dikhega. Wo delivery app me jaakar badal sakta hai.</p>
      <div className="adm-cred">
        <div className="adm-cred-row">
          <div><small>EMAIL</small><b>{creds.email}</b></div>
          <button className="adm-icon-btn edit" onClick={() => copy(creds.email)} aria-label="Copy email"><HiOutlineClipboardCopy /></button>
        </div>
        <div className="adm-cred-row">
          <div><small>PASSWORD</small><b>{creds.password}</b></div>
          <button className="adm-icon-btn edit" onClick={() => copy(creds.password)} aria-label="Copy password"><HiOutlineClipboardCopy /></button>
        </div>
      </div>
      <button className="adm-btn block" onClick={onClose}>Done</button>
    </div>
  </div>
);

const DeliveryPartners = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [creds, setCreds] = useState(null);

  const load = async () => {
    try {
      const { data } = await API.get(BASE);
      setPartners(data.partners);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Partners load nahi hue');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (p) => {
    if (p.isActive && !window.confirm(`${p.name} ko disable karna hai? Wo login nahi kar paega.`)) return;
    try {
      await API.put(`${BASE}/${p._id}`, { isActive: !p.isActive });
      toast.success(p.isActive ? 'Partner disabled' : 'Partner enabled');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const resetPassword = async (p) => {
    if (!window.confirm(`${p.name} ka naya password banana hai? Purana password band ho jayega.`)) return;
    try {
      const { data } = await API.put(`${BASE}/${p._id}/password`, {});
      setCreds({ title: `${p.name} ka naya password`, email: p.email, password: data.password });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`${p.name} ko delete karna hai?`)) return;
    try {
      await API.delete(`${BASE}/${p._id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const q = query.trim().toLowerCase();
  const list = q
    ? partners.filter((p) => [p.name, p.email, p.phone, p.city].some((v) => v?.toLowerCase().includes(q)))
    : partners;
  const activeCount = partners.filter((p) => p.isActive).length;
  const onlineCount = partners.filter((p) => p.isActive && p.isAvailable).length;

  if (loading) return <div className="adm-spin-wrap"><div className="adm-spin" /></div>;

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Delivery Partners</h1>
          <p className="adm-sub">{partners.length} partners · {activeCount} active · {onlineCount} online</p>
        </div>
        <div className="adm-actions">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone, city"
            className="adm-input adm-search"
          />
          <Link to="/admin/approvals" className="adm-btn">
            <HiOutlineBadgeCheck /> Approvals
          </Link>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th>Partner</th><th>Phone</th><th>Vehicle</th><th>City</th><th>Orders</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div className="adm-user">
                      <span className="adm-avatar">{p.name?.charAt(0)?.toUpperCase() || 'D'}</span>
                      <div>
                        <span className="adm-strong">{p.name}</span>
                        <p className="adm-muted" style={{ margin: 0 }}>{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>{p.phone}</td>
                  <td className="adm-vehicle">{[p.vehicleType, p.vehicleNumber].filter(Boolean).join(' · ') || '—'}</td>
                  <td>{p.city || '—'}</td>
                  <td>
                    <span className="adm-strong">{p.activeOrders}</span> <span className="adm-muted">active</span>
                    <p className="adm-muted" style={{ margin: 0 }}>{p.deliveredOrders} delivered</p>
                  </td>
                  <td>
                    {!p.isActive ? (
                      <span className="adm-badge bad">Disabled</span>
                    ) : p.isAvailable ? (
                      <span className="adm-badge ok">Online</span>
                    ) : (
                      <span className="adm-badge gray">Offline</span>
                    )}
                  </td>
                  <td>
                    <div className="adm-actions">
                      <button
                        className={`adm-icon-btn ${p.isActive ? 'del' : 'edit'}`}
                        onClick={() => toggleActive(p)}
                        title={p.isActive ? 'Disable' : 'Enable'}
                        aria-label={p.isActive ? 'Disable' : 'Enable'}
                      >
                        {p.isActive ? <HiOutlineBan /> : <HiOutlineCheckCircle />}
                      </button>
                      <button className="adm-icon-btn edit" onClick={() => resetPassword(p)} title="Reset password" aria-label="Reset password"><HiOutlineKey /></button>
                      <button className="adm-icon-btn del" onClick={() => remove(p)} title="Delete" aria-label="Delete"><HiOutlineTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <div className="adm-empty">
              {partners.length === 0 ? 'Abhi koi delivery partner nahi hai. Manager ke bheje applications Approvals me approve karo.' : 'No partners found.'}
            </div>
          )}
        </div>
      </div>

      {creds && <CredModal creds={creds} onClose={() => setCreds(null)} />}
    </div>
  );
};

export default DeliveryPartners;