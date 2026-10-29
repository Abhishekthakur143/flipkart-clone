import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineClipboardCopy, HiOutlinePlus, HiOutlineRefresh, HiOutlineX } from 'react-icons/hi';
import API from '../../utils/api';
import '../../components/admin/admin.css';
import '../../components/deals/deals.css';

const msg = (e, f = 'Something went wrong') => e?.response?.data?.message || f;
const copy = (t) => navigator.clipboard.writeText(t).then(() => toast.success('Copied'), () => toast.error('Copy nahi hua'));
const TONE = { Invited: 'gray', Pending: 'warn', Verified: 'ok', Rejected: 'bad' };
const TABS = ['Requests', 'All', 'Pending', 'Verified', 'Invited', 'Rejected'];
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const Line = ({ k, v }) => (v ? <div className="adm-list-row"><div className="adm-list-main"><span>{k}</span><b style={{ whiteSpace: 'normal' }}>{v}</b></div></div> : null);

const Sellers = () => {
  const [sellers, setSellers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState('Requests');
  const [fromRequest, setFromRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', shopName: '' });
  const [link, setLink] = useState(null); // { name, setupLink, emailed }
  const [review, setReview] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try { const { data } = await API.get('/seller/manager/list'); setSellers(data.sellers || []); }
    catch (e) { toast.error(msg(e, 'Sellers load nahi hue')); }
    try { const { data } = await API.get('/seller/manager/requests'); setRequests(data.requests || []); }
    catch (e) { toast.error(msg(e, 'Requests load nahi hue')); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const newReqs = requests.filter((r) => r.status === 'New');
  const grantFrom = (r) => { setFromRequest(r); setForm({ name: r.name, email: r.email, phone: r.phone || '', shopName: r.shopName || '' }); setInviting(true); };
  const dismiss = async (r) => {
    if (!window.confirm(`${r.name} ki request hata dein?`)) return;
    setBusy(r._id);
    try { await API.put(`/seller/manager/requests/${r._id}/dismiss`, {}); toast.success('Request dismissed'); await load(); }
    catch (err) { toast.error(msg(err)); }
    setBusy('');
  };

  const shown = sellers.filter((s) => tab === 'All' || s.profile.status === tab);
  const count = (t) => (t === 'Requests' ? newReqs.length : t === 'All' ? sellers.length : sellers.filter((s) => s.profile.status === t).length);

  const invite = async (e) => {
    e.preventDefault(); setBusy('invite');
    try {
      const { data } = await API.post('/seller/manager/invite', { ...form, requestId: fromRequest?._id });
      setInviting(false); setFromRequest(null); setForm({ name: '', email: '', phone: '', shopName: '' });
      setLink({ name: data.seller.user.name, setupLink: data.setupLink, emailed: data.emailed });
      await load();
    } catch (err) { toast.error(msg(err)); }
    setBusy('');
  };
  const resend = async (s) => {
    setBusy(s.user._id);
    try { const { data } = await API.put(`/seller/manager/${s.profile._id}/resend`, {}); setLink({ name: s.user.name, setupLink: data.setupLink, emailed: data.emailed }); }
    catch (err) { toast.error(msg(err)); }
    setBusy('');
  };
  const verify = async (s) => {
    if (!window.confirm(`${s.profile.shopName || s.user.name} ko verify karna hai?`)) return;
    setBusy(s.user._id);
    try { await API.put(`/seller/manager/${s.profile._id}/verify`, {}); toast.success('Seller verified'); setReview(null); await load(); }
    catch (err) { toast.error(msg(err)); }
    setBusy('');
  };
  const reject = async (s) => {
    setBusy(s.user._id);
    try { await API.put(`/seller/manager/${s.profile._id}/reject`, { reason }); toast.success('Sent back to seller'); setReview(null); setReason(''); await load(); }
    catch (err) { toast.error(msg(err)); }
    setBusy('');
  };
  const toggle = async (s) => {
    setBusy(s.user._id);
    try { await API.put(`/seller/manager/${s.profile._id}/active`, { isActive: !s.user.isActive }); await load(); }
    catch (err) { toast.error(msg(err)); }
    setBusy('');
  };

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Sellers</h1>
          <p className="adm-sub">Seller ka email aane par yahan se access do. Phir uski shop verify karo.</p>
        </div>
        <div className="adm-actions">
          <button className="adm-btn ghost" onClick={() => { setLoading(true); load(); }}><HiOutlineRefresh /> Refresh</button>
          <button className="adm-btn" onClick={() => { setFromRequest(null); setForm({ name: '', email: '', phone: '', shopName: '' }); setInviting(true); }}><HiOutlinePlus /> Grant access</button>
        </div>
      </div>

      <div className="adm-chips">
        {TABS.map((t) => <button key={t} className={`adm-chip ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{t}<em>{count(t)}</em></button>)}
      </div>

      {loading ? <div className="adm-spin-wrap" style={{ minHeight: 200 }}><div className="adm-spin" /></div> : tab === 'Requests' ? (
        <div className="adm-card">
          <div className="adm-card-head"><h2>Seller requests inbox</h2></div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>From</th><th>Shop</th><th>Message</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r._id}>
                    <td><span className="adm-strong">{r.name}</span><p className="adm-muted" style={{ margin: 0 }}>{r.email}{r.phone ? ` · ${r.phone}` : ''}</p></td>
                    <td>{r.shopName || '—'}<p className="adm-muted" style={{ margin: 0 }}>{[r.city, r.sells].filter(Boolean).join(' · ')}</p></td>
                    <td className="adm-muted" style={{ whiteSpace: 'normal', maxWidth: 260 }}>{r.message || '—'}</td>
                    <td>{fmt(r.createdAt)}</td>
                    <td>
                      {r.status === 'New' ? (
                        <div className="adm-actions">
                          <a className="adm-btn sm ghost" href={`mailto:${r.email}?subject=${encodeURIComponent('Your seller request')}&body=${encodeURIComponent(`Hi ${r.name},\n\nThanks for your interest in selling with us. `)}`}>Reply by email</a>
                          {r.phone && <a className="adm-btn sm ghost" href={`tel:${r.phone}`}>Call</a>}
                          <button className="adm-btn sm" onClick={() => grantFrom(r)}>Grant access</button>
                          <button className="adm-del-text" disabled={busy === r._id} onClick={() => dismiss(r)}>Dismiss</button>
                        </div>
                      ) : <span className={`adm-badge ${r.status === 'Granted' ? 'ok' : 'gray'}`}>{r.status}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length === 0 && <div className="adm-empty">Abhi koi request nahi aayi. Sellers ko <b>/become-seller</b> page ka link do.</div>}
          </div>
        </div>
      ) : (
        <div className="adm-card">
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Seller</th><th>Shop</th><th>Status</th><th>Deals</th><th></th></tr></thead>
              <tbody>
                {shown.map((s) => (
                  <tr key={s.user._id}>
                    <td><span className="adm-strong">{s.user.name}</span><p className="adm-muted" style={{ margin: 0 }}>{s.user.email}</p></td>
                    <td>{s.profile.shopName || '—'}<p className="adm-muted" style={{ margin: 0 }}>{s.profile.city}</p></td>
                    <td>
                      <span className={`adm-badge ${TONE[s.profile.status]}`}>{s.profile.status}</span>
                      {s.profile.trusted && <span className="dl-trusted" style={{ marginLeft: 6 }}>★ Trusted</span>}
                      {!s.user.isActive && <span className="adm-badge bad" style={{ marginLeft: 6 }}>Disabled</span>}
                    </td>
                    <td>{s.dealCount}{s.approvedDeals > 0 && <p className="adm-muted" style={{ margin: 0 }}>{s.approvedDeals} live</p>}</td>
                    <td>
                      <div className="adm-actions">
                        {s.profile.status === 'Pending' && <button className="adm-btn sm" onClick={() => { setReview(s); setReason(''); }}>Review</button>}
                        {s.profile.status === 'Invited' && <button className="adm-btn sm ghost" disabled={busy === s.user._id} onClick={() => resend(s)}>New link</button>}
                        {['Verified', 'Rejected'].includes(s.profile.status) && <button className="adm-btn sm ghost" onClick={() => { setReview(s); setReason(''); }}>Details</button>}
                        <button className="adm-del-text" disabled={busy === s.user._id} onClick={() => toggle(s)}>{s.user.isActive ? 'Disable' : 'Enable'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && <div className="adm-empty">Yahan abhi koi seller nahi hai.</div>}
          </div>
        </div>
      )}

      {inviting && (
        <div className="adm-modal-back" onClick={() => busy || setInviting(false)}>
          <div className="adm-modal" role="dialog" aria-label="Grant access" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => setInviting(false)} aria-label="Close"><HiOutlineX /></button>
            <h2>{fromRequest ? `Grant access to ${fromRequest.name}` : 'Grant seller access'}</h2>
            <p className="adm-modal-sub">Seller ko password set karne ka link email hoga. Link 7 din chalta hai.</p>
            <form className="adm-form" onSubmit={invite}>
              <div><label className="adm-label" htmlFor="si-name">Name</label><input id="si-name" className="adm-input" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="adm-label" htmlFor="si-email">Email</label><input id="si-email" className="adm-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="adm-label" htmlFor="si-phone">Mobile (optional)</label><input id="si-phone" className="adm-input" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <button type="submit" className="adm-btn block" disabled={busy === 'invite'}>{busy === 'invite' ? 'Sending...' : 'Send access link'}</button>
            </form>
          </div>
        </div>
      )}

      {link && (
        <div className="adm-modal-back" onClick={() => setLink(null)}>
          <div className="adm-modal" role="dialog" aria-label="Access link" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => setLink(null)} aria-label="Close"><HiOutlineX /></button>
            <h2>Access for {link.name}</h2>
            <p className="adm-modal-sub">{link.emailed ? 'Link seller ko email ho gaya hai. Backup ke liye ye yahan bhi hai.' : 'Email nahi ja saka. Ye link seller ko khud bhej do.'}</p>
            <div className="adm-cred"><div className="adm-cred-row"><div style={{ minWidth: 0 }}><small>PASSWORD SET LINK</small><b style={{ wordBreak: 'break-all', fontSize: 13 }}>{link.setupLink}</b></div><button className="adm-icon-btn edit" onClick={() => copy(link.setupLink)} aria-label="Copy link"><HiOutlineClipboardCopy /></button></div></div>
            <button className="adm-btn block" onClick={() => setLink(null)}>Done</button>
          </div>
        </div>
      )}

      {review && (
        <div className="adm-modal-back" onClick={() => busy || setReview(null)}>
          <div className="adm-modal dl-modal-wide" role="dialog" aria-label="Seller details" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => setReview(null)} aria-label="Close"><HiOutlineX /></button>
            <h2>{review.profile.shopName || review.user.name}</h2>
            <p className="adm-modal-sub"><span className={`adm-badge ${TONE[review.profile.status]}`}>{review.profile.status}</span></p>
            {review.profile.shopPhoto?.url && <img className="dl-shop" src={review.profile.shopPhoto.url} alt="Shop" />}
            <Line k="Shop" v={[review.profile.shopName, review.profile.shopType].filter(Boolean).join(' · ')} />
            <Line k="Address" v={[review.profile.shopAddress, review.profile.city, review.profile.state, review.profile.pincode].filter(Boolean).join(', ')} />
            <Line k="Owner" v={[review.profile.ownerName, review.profile.phone].filter(Boolean).join(' · ')} />
            <Line k="Email" v={review.user.email} />
            <Line k="ID" v={review.profile.idNumber ? `${review.profile.idType} ${review.profile.idNumber}` : ''} />
            <Line k="GST" v={review.profile.gstNumber} />
            <Line k="Years in business" v={review.profile.yearsInBusiness ? String(review.profile.yearsInBusiness) : ''} />
            <Line k="Website" v={review.profile.website} />
            <Line k="Sells" v={review.profile.sells} />
            <Line k="Pays to" v={review.profile.payoutDetails} />
            <Line k="Sent back earlier" v={review.profile.rejectReason} />
            {review.profile.status === 'Pending' && (
              <>
                <label className="adm-label" htmlFor="sr-reason" style={{ marginTop: 14 }}>Reason (zaroori hai agar wapas bhejna ho)</label>
                <textarea id="sr-reason" className="adm-textarea" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="adm-actions" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
                  <button className="adm-btn gray" disabled={!!busy || !reason.trim()} onClick={() => reject(review)}>Send back</button>
                  <button className="adm-btn" disabled={!!busy} onClick={() => verify(review)}>Verify seller</button>
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
