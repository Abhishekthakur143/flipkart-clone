import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineCheck, HiOutlineClipboardCopy, HiOutlineRefresh, HiOutlineX } from 'react-icons/hi';
import API from '../../utils/api';
import '../../components/admin/admin.css';

const BASE = '/partner-requests/admin';
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const msg = (e, f = 'Something went wrong') => e?.response?.data?.message || f;
const copy = (t) => navigator.clipboard.writeText(t).then(() => toast.success('Copied'), () => toast.error('Copy nahi hua'));

const Line = ({ k, v }) => (v ? <div className="adm-list-row"><div className="adm-list-main"><span>{k}</span><b style={{ whiteSpace: 'normal' }}>{v}</b></div></div> : null);

// Yahan sirf "Yes" ya "No" bolna hai. Phase 3 me product deals bhi isi page par aayengi.
const Approvals = () => {
  const [tab, setTab] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');
  const [creds, setCreds] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await API.get(BASE);
      setRequests(data.requests || []);
    } catch (e) { toast.error(msg(e, 'Approvals load nahi hue')); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const pending = requests.filter((r) => r.status === 'Forwarded');
  const history = requests.filter((r) => r.status !== 'Forwarded');

  const approve = async (r) => {
    if (!window.confirm(`${r.name} ko delivery partner banana hai? Account ban jayega aur login details email honge.`)) return;
    setBusyId(r._id);
    try {
      const { data } = await API.put(`${BASE}/${r._id}/approve`, {});
      setCreds({ name: r.name, email: data.partner.email, password: data.password, emailed: data.emailed });
      await load();
    } catch (e) { toast.error(msg(e)); }
    setBusyId('');
  };

  const reject = async () => {
    setBusyId(rejecting._id);
    try {
      await API.put(`${BASE}/${rejecting._id}/reject`, { note });
      toast.success('Rejected');
      setRejecting(null);
      setNote('');
      await load();
    } catch (e) { toast.error(msg(e)); }
    setBusyId('');
  };

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Approvals</h1>
          <p className="adm-sub"></p>
        </div>
        <button className="adm-btn ghost" onClick={() => { setLoading(true); load(); }}><HiOutlineRefresh /> Refresh</button>
      </div>

      <div className="adm-chips">
        <button className={`adm-chip ${tab === 'pending' ? 'on' : ''}`} onClick={() => setTab('pending')}>Waiting for you<em>{pending.length}</em></button>
        <button className={`adm-chip ${tab === 'history' ? 'on' : ''}`} onClick={() => setTab('history')}>History<em>{history.length}</em></button>
      </div>

      {loading ? (
        <div className="adm-spin-wrap" style={{ minHeight: 200 }}><div className="adm-spin" /></div>
      ) : tab === 'pending' ? (
        pending.length === 0 ? (
          <div className="adm-card"><div className="adm-empty">Abhi koi approval baaki nahi hai.</div></div>
        ) : (
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))' }}>
            {pending.map((r) => (
              <div className="adm-card adm-pad" key={r._id}>
                <div className="adm-user" style={{ marginBottom: 12 }}>
                  <span className="adm-avatar">{r.name?.charAt(0)?.toUpperCase()}</span>
                  <div>
                    <span className="adm-strong">{r.name}</span>
                    <p className="adm-muted" style={{ margin: 0 }}>Delivery partner · {r.source === 'manager' ? 'added by manager' : 'applied online'} · {fmt(r.createdAt)}</p>
                  </div>
                </div>
                <Line k="Email" v={r.email} />
                <Line k="Mobile" v={r.phone} />
                <Line k="City" v={r.city} />
                <Line k="Vehicle" v={[r.vehicleType, r.vehicleNumber].filter(Boolean).join(' · ')} />
                <Line k="Driving licence" v={r.licenseNumber} />
                <Line k="Experience" v={r.experience} />
                <Line k="Manager's note" v={r.managerNote} />
                <div className="adm-actions" style={{ marginTop: 16 }}>
                  <button className="adm-btn" style={{ flex: 1 }} disabled={busyId === r._id} onClick={() => approve(r)}><HiOutlineCheck /> {busyId === r._id ? 'Please wait...' : 'Yes, approve'}</button>
                  <button className="adm-del-text" disabled={busyId === r._id} onClick={() => { setRejecting(r); setNote(''); }}>No</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="adm-card">
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Applicant</th><th>City</th><th>Decision</th><th>Date</th><th>Note</th></tr></thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r._id}>
                    <td><span className="adm-strong">{r.name}</span><p className="adm-muted" style={{ margin: 0 }}>{r.email}</p></td>
                    <td>{r.city}</td>
                    <td><span className={`adm-badge ${r.status === 'Approved' ? 'ok' : 'bad'}`}>{r.status}</span></td>
                    <td>{r.decidedAt ? fmt(r.decidedAt) : '—'}</td>
                    <td className="adm-muted">{r.adminNote || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length === 0 && <div className="adm-empty">Abhi koi faisla nahi hua.</div>}
          </div>
        </div>
      )}

      {rejecting && (
        <div className="adm-modal-back" onClick={() => busyId || setRejecting(null)}>
          <div className="adm-modal" role="dialog" aria-label="Reject" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => setRejecting(null)} aria-label="Close"><HiOutlineX /></button>
            <h2>Reject {rejecting.name}?</h2>
            <p className="adm-modal-sub">Applicant ko email jayega ki application aage nahi badh sakti.</p>
            <label className="adm-label" htmlFor="ap-note">Reason (optional, sirf record ke liye)</label>
            <textarea id="ap-note" className="adm-textarea" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="adm-actions" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="adm-btn ghost" onClick={() => setRejecting(null)}>Cancel</button>
              <button className="adm-btn gray" disabled={!!busyId} onClick={reject}>{busyId ? 'Rejecting...' : 'Reject'}</button>
            </div>
          </div>
        </div>
      )}

      {creds && (
        <div className="adm-modal-back" onClick={() => setCreds(null)}>
          <div className="adm-modal" role="dialog" aria-label="Approved" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => setCreds(null)} aria-label="Close"><HiOutlineX /></button>
            <h2>{creds.name} ab Delivery Partner hai</h2>
            <p className="adm-modal-sub">
              {creds.emailed
                ? 'Login details applicant ko email ho gaye hain. Backup ke liye ye abhi dikh rahe hain, baad me dobara nahi dikhenge.'
                : 'Email nahi ja saka. Ye login details khud partner ko de do. Ye baad me dobara nahi dikhenge.'}
            </p>
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

export default Approvals;
