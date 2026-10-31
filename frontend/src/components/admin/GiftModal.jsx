import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { HiOutlineX } from 'react-icons/hi';
import API from '../../utils/api';
import './admin.css';

export const GIFT_TYPES = [
  ['bonus', 'Cash bonus / incentive'],
  ['coupon', 'Coupon (customers only)'],
  ['points', 'Loyalty points'],
  ['badge', 'Badge / trophy'],
  ['commission', 'Commission discount'],
  ['other', 'Other surprise'],
];
export const RECIPIENTS = [
  ['user', 'Customer'],
  ['delivery', 'Delivery partner'],
  ['manager', 'Manager'],
  ['seller', 'Seller'],
];

// initial = { type, id, name } -> recipient fixed (Analytics se). Khali ho to search se chuno.
const GiftModal = ({ initial, onClose, onDone }) => {
  const isSuper = useSelector((st) => st.auth.user?.role) === 'superadmin';
  const recipients = isSuper ? [...RECIPIENTS, ['admin', 'Admin']] : RECIPIENTS;
  const locked = !!initial?.id;
  const [type, setType] = useState(initial?.type || 'user');
  const [picked, setPicked] = useState(locked ? { id: initial.id, name: initial.name } : null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [f, setF] = useState({ title: '', giftType: 'bonus', amount: '', note: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (locked || picked) return undefined;
    const t = setTimeout(async () => {
      try {
        const { data } = await API.get('/admin/rewards/recipients', { params: { type, q } });
        setResults(data.list || []);
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [type, q, locked, picked]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const types = type === 'user' ? GIFT_TYPES : GIFT_TYPES.filter(([k]) => k !== 'coupon');

  const submit = async (e) => {
    e.preventDefault();
    if (!picked) return toast.error('Choose who gets the gift');
    setBusy(true);
    try {
      const { data } = await API.post('/admin/rewards', {
        recipientType: type, recipientId: picked.id, title: f.title, giftType: f.giftType, amount: f.amount, note: f.note,
      });
      toast.success(data.message || 'Gift given');
      onDone && onDone(data.reward);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not give the gift');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-modal-back" onClick={onClose}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="adm-modal-x" onClick={onClose} aria-label="Close"><HiOutlineX /></button>
        <h2>Give a gift</h2>
        <p className="adm-modal-sub">{picked ? `To: ${picked.name}` : 'Choose who should get a surprise.'}</p>

        <form className="adm-form" onSubmit={submit}>
          {!locked && (
            <>
              <div>
                <label className="adm-label">Recipient type</label>
                <select className="adm-select" value={type} onChange={(e) => { setType(e.target.value); setPicked(null); setResults([]); }}>
                  {recipients.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              {picked ? (
                <div className="gr-picked">
                  <b>{picked.name}</b>
                  <button type="button" className="adm-del-text" onClick={() => setPicked(null)}>Change</button>
                </div>
              ) : (
                <div>
                  <label className="adm-label">Search name or email</label>
                  <input className="adm-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search" />
                  <div className="gr-results">
                    {results.map((r) => (
                      <button type="button" key={r.id} onClick={() => setPicked({ id: r.id, name: r.name })}>
                        <b>{r.name}</b><span>{r.sub}</span>
                      </button>
                    ))}
                    {results.length === 0 && <p className="adm-muted">No match yet.</p>}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="adm-label">Gift title</label>
            <input className="adm-input" value={f.title} onChange={set('title')} placeholder="e.g. Best Delivery Partner of the Month" maxLength={120} required />
          </div>
          <div className="adm-row2">
            <div>
              <label className="adm-label">Gift type</label>
              <select className="adm-select" value={f.giftType} onChange={set('giftType')}>
                {types.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="adm-label">Amount / value</label>
              <input className="adm-input" type="number" min="0" value={f.amount} onChange={set('amount')} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="adm-label">Note (optional)</label>
            <textarea className="adm-textarea" rows={2} value={f.note} onChange={set('note')} maxLength={300} />
          </div>
          <button className="adm-btn block" disabled={busy}>{busy ? 'Saving…' : 'Give gift'}</button>
        </form>
      </div>
    </div>
  );
};

export default GiftModal;
