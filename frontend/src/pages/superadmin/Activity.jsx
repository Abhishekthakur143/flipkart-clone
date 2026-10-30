import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineRefresh } from 'react-icons/hi';
import API from '../../utils/api';
import '../../components/admin/admin.css';

const msg = (e, f = 'Something went wrong') => e?.response?.data?.message || f;
const TABS = [['', 'All'], ['superadmin', 'Super admin'], ['admin', 'Admin'], ['manager', 'Manager'], ['seller', 'Seller']];
const TONE = { superadmin: 'purple', admin: 'info', manager: 'warn', seller: 'ok' };
const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// Kisne kya kiya: sab roles ke badlaav wale kaam (90 din tak)
const Activity = () => {
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ logs: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setData((await API.get('/superadmin/activity', { params: { role, q, page } })).data); }
    catch (e) { toast.error(msg(e, 'Activity load nahi hui')); }
    setLoading(false);
  }, [role, q, page]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

  return (
    <div>
      <div className="adm-head">
        <div><h1 className="adm-title">Activity log</h1><p className="adm-sub">Kisne kya kiya. Sirf badlaav wale kaam dikhte hain, passwords ya form ka data kabhi nahi. 90 din baad apne aap hat jata hai.</p></div>
        <button className="adm-btn ghost" onClick={() => { setLoading(true); load(); }}><HiOutlineRefresh /> Refresh</button>
      </div>
      <div className="adm-chips">
        {TABS.map(([k, t]) => <button key={k || 'all'} className={`adm-chip ${role === k ? 'on' : ''}`} onClick={() => { setRole(k); setPage(1); }}>{t}</button>)}
      </div>
      <input className="adm-input" style={{ marginBottom: 14, maxWidth: 360 }} type="search" placeholder="Search name, email or action" aria-label="Search activity" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      {loading ? <div className="adm-spin-wrap" style={{ minHeight: 200 }}><div className="adm-spin" /></div> : (
        <div className="adm-card"><div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead>
            <tbody>
              {data.logs.map((l) => (
                <tr key={l._id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{when(l.createdAt)}</td>
                  <td><span className="adm-strong">{l.name}</span> <span className={`adm-badge ${TONE[l.role] || 'gray'}`}>{l.role}</span><p className="adm-muted" style={{ margin: 0 }}>{l.email}</p></td>
                  <td style={{ whiteSpace: 'normal' }}><span className={/FAILED/.test(l.action) ? 'adm-badge bad' : ''}>{l.action}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.logs.length === 0 && <div className="adm-empty">Koi activity nahi mili.</div>}
        </div></div>
      )}
      {data.pages > 1 && (
        <div className="adm-actions" style={{ justifyContent: 'center', marginTop: 14 }}>
          <button className="adm-btn sm ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="adm-sub" style={{ alignSelf: 'center' }}>Page {data.page || page} of {data.pages}</span>
          <button className="adm-btn sm ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
};

export default Activity;
