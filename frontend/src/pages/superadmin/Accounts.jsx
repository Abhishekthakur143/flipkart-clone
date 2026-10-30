import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { HiOutlineClipboardCopy, HiOutlinePlus, HiOutlineRefresh, HiOutlineX } from 'react-icons/hi';
import API from '../../utils/api';
import '../../components/admin/admin.css';
import '../../components/deals/deals.css';

const msg = (e, f = 'Something went wrong') => e?.response?.data?.message || f;
const copy = (t) => navigator.clipboard.writeText(t).then(() => toast.success('Copied'), () => toast.error('Copy nahi hua'));
const TABS = [['', 'All'], ['superadmin', 'Super admins'], ['admin', 'Admins'], ['manager', 'Managers'], ['seller', 'Sellers'], ['user', 'Customers']];
const TONE = { superadmin: 'purple', admin: 'info', manager: 'warn', seller: 'ok', user: 'gray' };
const EMPTY = { name: '', email: '', phone: '', role: 'admin', password: '' };

const Accounts = () => {
  const me = useSelector((s) => s.auth.user);
  const [params, setParams] = useSearchParams();
  const role = params.get('role') || '';
  const [q, setQ] = useState('');
  const [list, setList] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [creds, setCreds] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await API.get('/superadmin/accounts', { params: { role, q } });
      setList(data.accounts || []); setCounts(data.counts || {});
    } catch (e) { toast.error(msg(e, 'Accounts load nahi hue')); }
    setLoading(false);
  }, [role, q]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

  const run = async (id, fn, ok) => {
    setBusy(id);
    try { const r = await fn(); if (ok) toast.success(ok); await load(); return r; }
    catch (e) { toast.error(msg(e)); }
    finally { setBusy(''); }
    return null;
  };
  const create = async (e) => {
    e.preventDefault();
    const r = await run('create', () => API.post('/superadmin/accounts', form));
    if (r) { setCreating(false); setCreds({ title: `${r.data.account.role} account created`, email: r.data.account.email, password: r.data.password }); setForm(EMPTY); }
  };
  const toggle = (a) => run(a._id, () => API.put(`/superadmin/accounts/${a._id}`, { isActive: !a.isActive }), a.isActive ? 'Account disabled' : 'Account enabled');
  const setRole = (a, r) => window.confirm(`${a.name} ka role "${r}" karna hai?`) && run(a._id, () => API.put(`/superadmin/accounts/${a._id}`, { role: r }), 'Role changed');
  const reset = async (a) => {
    if (!window.confirm(`${a.name} ka naya password banana hai? Purana band ho jayega.`)) return;
    const r = await run(a._id, () => API.put(`/superadmin/accounts/${a._id}/password`, {}));
    if (r) setCreds({ title: `New password for ${a.name}`, email: a.email, password: r.data.password });
  };
  const del = (a) => window.confirm(`${a.name} ko hamesha ke liye hatana hai?`) && run(a._id, () => API.delete(`/superadmin/accounts/${a._id}`), 'Account deleted');
  const switchable = (a) => a.role !== 'seller' && String(a._id) !== String(me?._id);

  return (
    <div>
      <div className="adm-head">
        <div><h1 className="adm-title">Accounts</h1><p className="adm-sub">Admin, manager aur super admin banao, role badlo, disable ya hatao.</p></div>
        <div className="adm-actions">
          <button className="adm-btn ghost" onClick={() => { setLoading(true); load(); }}><HiOutlineRefresh /> Refresh</button>
          <button className="adm-btn" onClick={() => setCreating(true)}><HiOutlinePlus /> New account</button>
        </div>
      </div>

      <div className="adm-chips">
        {TABS.map(([k, t]) => <button key={k || 'all'} className={`adm-chip ${role === k ? 'on' : ''}`} onClick={() => setParams(k ? { role: k } : {})}>{t}{k && <em>{counts[k] ?? 0}</em>}</button>)}
      </div>
      <input className="adm-input" style={{ marginBottom: 14, maxWidth: 360 }} type="search" placeholder="Search name or email" aria-label="Search accounts" value={q} onChange={(e) => setQ(e.target.value)} />

      {loading ? <div className="adm-spin-wrap" style={{ minHeight: 200 }}><div className="adm-spin" /></div> : (
        <div className="adm-card"><div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Account</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((a) => {
                const self = String(a._id) === String(me?._id);
                return (
                  <tr key={a._id}>
                    <td><span className="adm-strong">{a.name}{self && ' (you)'}</span><p className="adm-muted" style={{ margin: 0 }}>{a.email}</p></td>
                    <td>
                      {switchable(a) ? (
                        <select className="adm-select" style={{ minWidth: 130 }} aria-label={`Role of ${a.name}`} value={a.role} disabled={busy === a._id} onChange={(e) => setRole(a, e.target.value)}>
                          {['superadmin', 'admin', 'manager', 'user'].map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : <span className={`adm-badge ${TONE[a.role]}`}>{a.role}</span>}
                    </td>
                    <td><span className={`adm-badge ${a.isActive ? 'ok' : 'bad'}`}>{a.isActive ? 'Active' : 'Disabled'}</span></td>
                    <td>
                      {!self && (
                        <div className="adm-actions">
                          <button className="adm-btn sm ghost" disabled={busy === a._id} onClick={() => toggle(a)}>{a.isActive ? 'Disable' : 'Enable'}</button>
                          <button className="adm-btn sm ghost" disabled={busy === a._id} onClick={() => reset(a)}>Reset password</button>
                          {['admin', 'manager', 'superadmin'].includes(a.role) && <button className="adm-del-text" disabled={busy === a._id} onClick={() => del(a)}>Delete</button>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && <div className="adm-empty">Koi account nahi mila.</div>}
        </div></div>
      )}

      {creating && (
        <div className="adm-modal-back" onClick={() => busy || setCreating(false)}>
          <div className="adm-modal" role="dialog" aria-label="New account" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => setCreating(false)} aria-label="Close"><HiOutlineX /></button>
            <h2>New account</h2>
            <p className="adm-modal-sub">Password khali chhodo to apne aap ban jayega aur ek baar dikhega.</p>
            <form className="adm-form" onSubmit={create}>
              <div><label className="adm-label" htmlFor="ac-role">Role</label><select id="ac-role" className="adm-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="admin">Admin</option><option value="manager">Manager</option><option value="superadmin">Super admin</option></select></div>
              <div><label className="adm-label" htmlFor="ac-name">Name</label><input id="ac-name" className="adm-input" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="adm-label" htmlFor="ac-email">Email</label><input id="ac-email" className="adm-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="adm-label" htmlFor="ac-phone">Mobile (optional)</label><input id="ac-phone" className="adm-input" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label className="adm-label" htmlFor="ac-pw">Password (optional, min 8)</label><input id="ac-pw" className="adm-input" type="text" autoComplete="off" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              {form.role === 'superadmin' && <p className="dl-hint bad">Super admin ke paas sab kuch ka access hota hai. Sirf bharosemand insaan ko do.</p>}
              <button type="submit" className="adm-btn block" disabled={busy === 'create'}>{busy === 'create' ? 'Creating...' : 'Create account'}</button>
            </form>
          </div>
        </div>
      )}

      {creds && (
        <div className="adm-modal-back" onClick={() => setCreds(null)}>
          <div className="adm-modal" role="dialog" aria-label="Login details" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => setCreds(null)} aria-label="Close"><HiOutlineX /></button>
            <h2 style={{ textTransform: 'capitalize' }}>{creds.title}</h2>
            <p className="adm-modal-sub">Ye password sirf abhi dikh raha hai. Copy karke us insaan ko surakshit tareeke se do.</p>
            <div className="adm-cred">
              <div className="adm-cred-row"><div><small>EMAIL</small><b>{creds.email}</b></div><button className="adm-icon-btn edit" onClick={() => copy(creds.email)} aria-label="Copy email"><HiOutlineClipboardCopy /></button></div>
              <div className="adm-cred-row"><div><small>PASSWORD</small><b>{creds.password}</b></div><button className="adm-icon-btn edit" onClick={() => copy(creds.password)} aria-label="Copy password"><HiOutlineClipboardCopy /></button></div>
            </div>
            <button className="adm-btn block" onClick={() => setCreds(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
