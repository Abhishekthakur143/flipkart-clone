import { useEffect, useState } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlineKey, HiOutlineTrash, HiOutlineBan,
  HiOutlineCheckCircle, HiOutlineClipboardCopy, HiOutlineRefresh, HiOutlineX,
} from 'react-icons/hi';
import '../../components/admin/admin.css';

const BASE = '/delivery/admin/partners';
const VEHICLES = ['Bike', 'Scooter', 'Cycle', 'EV'];
const EMPTY = { name: '', email: '', phone: '', password: '', vehicleType: 'Bike', vehicleNumber: '', city: '' };

const genPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint32Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join('');
};

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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
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

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await API.post(BASE, form);
      setShowForm(false);
      setForm(EMPTY);
      setCreds({ title: `${data.partner.name} ab Delivery Partner hai`, email: data.partner.email, password: data.password });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Partner nahi ban paya');
    }
    setSaving(false);
  };

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
          <button className="adm-btn" onClick={() => setShowForm(true)}>
            <HiOutlinePlus /> Add Partner
          </button>
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
              {partners.length === 0 ? "Abhi koi delivery partner nahi hai. 'Add Partner' se pehla partner jodo." : 'No partners found.'}
            </div>
          )}
        </div>
      </div>

      {/* Add partner modal */}
      {showForm && (
        <div className="adm-modal-back" onClick={() => setShowForm(false)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => setShowForm(false)} aria-label="Close"><HiOutlineX /></button>
            <h2>Add Delivery Partner</h2>
            <p className="adm-modal-sub">Sirf yahan se banaye hue partner hi delivery app me login kar sakte hain.</p>
            <form onSubmit={handleCreate} className="adm-form">
              <div className="adm-row2">
                <div>
                  <label className="adm-label">Full Name</label>
                  <input className="adm-input" value={form.name} onChange={set('name')} required />
                </div>
                <div>
                  <label className="adm-label">Phone</label>
                  <input className="adm-input" value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" required />
                </div>
              </div>
              <div>
                <label className="adm-label">Email (login ke liye)</label>
                <input type="email" className="adm-input" value={form.email} onChange={set('email')} required />
              </div>
              <div>
                <label className="adm-label">Password (khali chhodo to apne aap ban jayega)</label>
                <div className="adm-pw-row">
                  <input className="adm-input" value={form.password} onChange={set('password')} placeholder="Min 6 characters" />
                  <button type="button" className="adm-btn ghost" onClick={() => setForm({ ...form, password: genPassword() })}>
                    <HiOutlineRefresh /> Generate
                  </button>
                </div>
              </div>
              <div className="adm-row2">
                <div>
                  <label className="adm-label">Vehicle Type</label>
                  <select className="adm-select" value={form.vehicleType} onChange={set('vehicleType')}>
                    {VEHICLES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="adm-label">Vehicle Number</label>
                  <input className="adm-input" value={form.vehicleNumber} onChange={set('vehicleNumber')} placeholder="MP09 AB 1234" />
                </div>
              </div>
              <div>
                <label className="adm-label">City</label>
                <input className="adm-input" value={form.city} onChange={set('city')} />
              </div>
              <button type="submit" className="adm-btn block" disabled={saving} style={{ height: 50 }}>
                {saving ? 'Creating...' : 'CREATE PARTNER'}
              </button>
            </form>
          </div>
        </div>
      )}

      {creds && <CredModal creds={creds} onClose={() => setCreds(null)} />}
    </div>
  );
};

export default DeliveryPartners;