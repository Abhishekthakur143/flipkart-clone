import { useEffect, useState } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlineKey, HiOutlineTrash, HiOutlineBan,
  HiOutlineCheckCircle, HiOutlineClipboardCopy, HiOutlineRefresh, HiOutlineX,
} from 'react-icons/hi';
import '../../components/admin/admin.css';

const BASE = '/admin/managers';
const EMPTY = { name: '', email: '', phone: '', password: '' };

const genPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint32Array(10);
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
      <p className="adm-modal-sub">Ye email aur password manager ko de do. Password sirf abhi dikh raha hai, baad me dobara nahi dikhega. Manager normal Login page se hi login karega.</p>
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

const Managers = () => {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [creds, setCreds] = useState(null);

  const load = async () => {
    try {
      const { data } = await API.get(BASE);
      setManagers(data.managers);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Managers load nahi hue');
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
      setCreds({ title: `${data.manager.name} ab Manager hai`, email: data.manager.email, password: data.password });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Manager nahi ban paya');
    }
    setSaving(false);
  };

  const toggleActive = async (m) => {
    if (m.isActive && !window.confirm(`${m.name} ko disable karna hai? Wo manager panel nahi khol paega.`)) return;
    try {
      await API.put(`${BASE}/${m._id}`, { isActive: !m.isActive });
      toast.success(m.isActive ? 'Manager disabled' : 'Manager enabled');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const resetPassword = async (m) => {
    if (!window.confirm(`${m.name} ka naya password banana hai? Purana password band ho jayega.`)) return;
    try {
      const { data } = await API.put(`${BASE}/${m._id}/password`, {});
      setCreds({ title: `${m.name} ka naya password`, email: m.email, password: data.password });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const remove = async (m) => {
    if (!window.confirm(`${m.name} ko delete karna hai?`)) return;
    try {
      await API.delete(`${BASE}/${m._id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  if (loading) return <div className="adm-spin-wrap"><div className="adm-spin" /></div>;

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Managers</h1>
          <p className="adm-sub">{managers.length} manager{managers.length === 1 ? '' : 's'} · har manager ko sirf apna manager dashboard dikhta hai</p>
        </div>
        <button className="adm-btn" onClick={() => setShowForm(true)}><HiOutlinePlus /> Add Manager</button>
      </div>

      <div className="adm-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Manager</th><th>Phone</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {managers.map((m) => (
                <tr key={m._id}>
                  <td>
                    <div className="adm-user">
                      <span className="adm-avatar">{m.name?.charAt(0)?.toUpperCase() || 'M'}</span>
                      <div>
                        <span className="adm-strong">{m.name}</span>
                        <p className="adm-muted" style={{ margin: 0 }}>{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>{m.phone || '—'}</td>
                  <td>{new Date(m.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>{m.isActive ? <span className="adm-badge ok">Active</span> : <span className="adm-badge bad">Disabled</span>}</td>
                  <td>
                    <div className="adm-actions">
                      <button className={`adm-icon-btn ${m.isActive ? 'del' : 'edit'}`} onClick={() => toggleActive(m)}
                        title={m.isActive ? 'Disable' : 'Enable'} aria-label={m.isActive ? 'Disable' : 'Enable'}>
                        {m.isActive ? <HiOutlineBan /> : <HiOutlineCheckCircle />}
                      </button>
                      <button className="adm-icon-btn edit" onClick={() => resetPassword(m)} title="Reset password" aria-label="Reset password"><HiOutlineKey /></button>
                      <button className="adm-icon-btn del" onClick={() => remove(m)} title="Delete" aria-label="Delete"><HiOutlineTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {managers.length === 0 && <div className="adm-empty">Abhi koi manager nahi hai. 'Add Manager' se pehla manager banao.</div>}
        </div>
      </div>

      {showForm && (
        <div className="adm-modal-back" onClick={() => setShowForm(false)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => setShowForm(false)} aria-label="Close"><HiOutlineX /></button>
            <h2>Add Manager</h2>
            <p className="adm-modal-sub">Manager delivery partners, orders aur sellers ka kaam sambhalega. Admin ka koi page use nahi dikhega.</p>
            <form onSubmit={handleCreate} className="adm-form">
              <div className="adm-row2">
                <div>
                  <label className="adm-label">Full Name</label>
                  <input className="adm-input" value={form.name} onChange={set('name')} required />
                </div>
                <div>
                  <label className="adm-label">Phone</label>
                  <input className="adm-input" value={form.phone} onChange={set('phone')} placeholder="Optional" />
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
              <button type="submit" className="adm-btn block" disabled={saving} style={{ height: 50 }}>
                {saving ? 'Creating...' : 'CREATE MANAGER'}
              </button>
            </form>
          </div>
        </div>
      )}

      {creds && <CredModal creds={creds} onClose={() => setCreds(null)} />}
    </div>
  );
};

export default Managers;
