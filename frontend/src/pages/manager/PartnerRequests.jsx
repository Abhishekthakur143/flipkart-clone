import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineRefresh, HiOutlineX } from 'react-icons/hi';
import API from '../../utils/api';
import '../../components/admin/admin.css';
import './manager.css';

const BASE = '/partner-requests/manager';
const VEHICLES = ['Bike', 'Scooter', 'Cycle', 'EV'];
const EMPTY = { name: '', phone: '', email: '', city: '', address: '', vehicleType: 'Bike', vehicleNumber: '', licenseNumber: '', experience: '', managerNote: '' };
const TABS = [
  { id: 'Applied', label: 'New applications', hint: 'Review karo: admin ko bhejo ya reject karo' },
  { id: 'Forwarded', label: 'With admin', hint: 'Admin ke yes / no ka intezaar' },
  { id: 'Approved', label: 'Approved', hint: 'Partner account ban chuka' },
  { id: 'Rejected', label: 'Rejected', hint: 'Reject hue applications' },
];
const tone = { Applied: 'warn', Forwarded: 'info', Approved: 'ok', Rejected: 'bad' };
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const msg = (e, f = 'Something went wrong') => e?.response?.data?.message || f;

const Row = ({ k, v }) => (v ? <div className="adm-list-row"><div className="adm-list-main"><span>{k}</span><b style={{ whiteSpace: 'normal' }}>{v}</b></div></div> : null);

const PartnerRequests = () => {
  const [tab, setTab] = useState('Applied');
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [view, setView] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    try {
      const { data } = await API.get(BASE);
      setRequests(data.requests || []);
      setCounts(data.counts || {});
    } catch (e) {
      toast.error(msg(e, 'Requests load nahi hue'));
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return requests.filter((r) => r.status === tab && (!t || [r.name, r.email, r.phone, r.city].some((v) => v?.toLowerCase().includes(t))));
  }, [requests, tab, q]);

  const open = (r) => { setView(r); setNote(''); };
  const act = async (kind) => {
    setBusy(kind);
    try {
      const r = await API.put(`${BASE}/${view._id}/${kind}`, { note });
      toast.success(r.data.message || 'Done');
      setView(null);
      await load();
    } catch (e) { toast.error(msg(e)); }
    setBusy('');
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const add = async (e) => {
    e.preventDefault();
    setBusy('add');
    try {
      const r = await API.post(`${BASE}/add`, form);
      toast.success(r.data.message || 'Sent to admin');
      setAdding(false);
      setForm(EMPTY);
      await load();
      setTab('Forwarded');
    } catch (err) { toast.error(msg(err)); }
    setBusy('');
  };

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Delivery partner requests</h1>
          <p className="adm-sub">Applications review karo aur admin ko bhejo. Partner ka account admin ke yes ke baad hi banta hai.</p>
        </div>
        <div className="adm-actions">
          <button className="adm-btn ghost" onClick={() => { setLoading(true); load(); }}><HiOutlineRefresh /> Refresh</button>
          <button className="adm-btn" onClick={() => setAdding(true)}><HiOutlinePlus /> Add partner</button>
        </div>
      </div>

      <div className="adm-chips">
        {TABS.map((t) => (
          <button key={t.id} className={`adm-chip ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)} title={t.hint}>
            {t.label}<em>{counts[t.id] || 0}</em>
          </button>
        ))}
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h2>{TABS.find((t) => t.id === tab).label}</h2>
          <input className="adm-input adm-search" style={{ height: 40 }} placeholder="Name, email, phone, city" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {loading ? (
          <div className="adm-spin-wrap" style={{ minHeight: 160 }}><div className="adm-spin" /></div>
        ) : shown.length === 0 ? (
          <div className="adm-empty">{q ? 'Koi request match nahi hui.' : `${TABS.find((t) => t.id === tab).hint}.`}</div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Applicant</th><th>Phone</th><th>City</th><th>Vehicle</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <div className="adm-user">
                        <span className="adm-avatar">{r.name?.charAt(0)?.toUpperCase() || 'D'}</span>
                        <div>
                          <span className="adm-strong">{r.name}</span>{' '}
                          {r.source === 'manager' && <span className="adm-badge gray">Added by you</span>}
                          <p className="adm-muted" style={{ margin: 0 }}>{r.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>{r.phone}</td>
                    <td>{r.city}</td>
                    <td className="adm-vehicle">{[r.vehicleType, r.vehicleNumber].filter(Boolean).join(' · ')}</td>
                    <td>{fmt(r.createdAt)}</td>
                    <td><button className={`adm-btn sm ${tab === 'Applied' ? '' : 'ghost'}`} onClick={() => open(r)}>{tab === 'Applied' ? 'Review' : 'View'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {view && (
        <div className="adm-modal-back" onClick={() => !busy && setView(null)}>
          <div className="adm-modal" role="dialog" aria-label="Review application" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => setView(null)} aria-label="Close"><HiOutlineX /></button>
            <h2>{view.name}</h2>
            <p className="adm-modal-sub"><span className={`adm-badge ${tone[view.status]}`}>{view.status === 'Forwarded' ? 'With admin' : view.status}</span> · applied {fmt(view.createdAt)}{view.source === 'manager' ? ' · added by manager' : ''}</p>
            <div style={{ marginBottom: 14 }}>
              <Row k="Email" v={view.email} />
              <Row k="Mobile" v={view.phone} />
              <Row k="City" v={view.city} />
              <Row k="Address" v={view.address} />
              <Row k="Vehicle" v={[view.vehicleType, view.vehicleNumber].filter(Boolean).join(' · ')} />
              <Row k="Driving licence" v={view.licenseNumber} />
              <Row k="Experience" v={view.experience} />
              <Row k="Message" v={view.message} />
              <Row k="Your note" v={view.status !== 'Applied' ? view.managerNote : ''} />
              <Row k="Admin note" v={view.adminNote} />
            </div>
            {view.status === 'Applied' && (
              <>
                <label className="adm-label" htmlFor="pr-note">Your note (admin ko dikhega)</label>
                <textarea id="pr-note" className="adm-textarea" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Phone par baat hui, documents theek hain" />
                <div className="adm-actions" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
                  <button className="adm-del-text" disabled={!!busy} onClick={() => act('reject')}>{busy === 'reject' ? 'Rejecting...' : 'Reject'}</button>
                  <button className="adm-btn" disabled={!!busy} onClick={() => act('forward')}>{busy === 'forward' ? 'Sending...' : 'Forward to admin'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {adding && (
        <div className="adm-modal-back" onClick={() => !busy && setAdding(false)}>
          <div className="adm-modal" role="dialog" aria-label="Add partner" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => setAdding(false)} aria-label="Close"><HiOutlineX /></button>
            <h2>Add delivery partner</h2>
            <p className="adm-modal-sub">Ye admin ke paas yes / no ke liye jayega. Account approve hone ke baad hi banega.</p>
            <form onSubmit={add} className="adm-form">
              <div className="adm-row2">
                <div><label className="adm-label">Full name</label><input className="adm-input" required value={form.name} onChange={set('name')} /></div>
                <div><label className="adm-label">Mobile</label><input className="adm-input" required value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" /></div>
              </div>
              <div className="adm-row2">
                <div><label className="adm-label">Email</label><input type="email" className="adm-input" required value={form.email} onChange={set('email')} /></div>
                <div><label className="adm-label">City</label><input className="adm-input" required value={form.city} onChange={set('city')} /></div>
              </div>
              <div className="adm-row2">
                <div>
                  <label className="adm-label">Vehicle</label>
                  <select className="adm-select" value={form.vehicleType} onChange={set('vehicleType')}>{VEHICLES.map((v) => <option key={v}>{v}</option>)}</select>
                </div>
                <div><label className="adm-label">Vehicle number</label><input className="adm-input" value={form.vehicleNumber} onChange={set('vehicleNumber')} placeholder="MP09 AB 1234" /></div>
              </div>
              <div><label className="adm-label">Address (optional)</label><input className="adm-input" value={form.address} onChange={set('address')} /></div>
              <div><label className="adm-label">Note for admin (optional)</label><input className="adm-input" maxLength={500} value={form.managerNote} onChange={set('managerNote')} /></div>
              <button type="submit" className="adm-btn block" disabled={busy === 'add'} style={{ height: 50 }}>{busy === 'add' ? 'Sending...' : 'SEND TO ADMIN'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerRequests;
