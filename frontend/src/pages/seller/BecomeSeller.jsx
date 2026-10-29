import { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import '../../components/admin/admin.css';
import '../../components/deals/deals.css';

const EMPTY = { name: '', email: '', phone: '', shopName: '', city: '', sells: '', message: '', website: '' /* honeypot */ };

// Public form: seller yahan se manager ko request bhejta hai. Request sirf manager ke inbox me jati hai.
const BecomeSeller = () => {
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await API.post('/seller/request', f); setDone(true); }
    catch (err) { setError(err.response?.data?.message || 'Could not connect to the server'); }
    setBusy(false);
  };

  return (
    <div className="dl-setup">
      <div className="adm-card" style={{ maxWidth: 520 }}>
        {done ? (
          <div role="status">
            <h1 className="adm-title" style={{ fontSize: 24 }}>Request sent</h1>
            <p className="adm-sub" style={{ margin: '8px 0 16px' }}>Aapki request manager ko bhej di gayi hai. Manager approve karega to <b>{f.email}</b> par password set karne ka link aayega.</p>
            <Link to="/" className="adm-btn">Back to store</Link>
          </div>
        ) : (
          <>
            <h1 className="adm-title" style={{ fontSize: 24 }}>Become a seller</h1>
            <p className="adm-sub" style={{ margin: '6px 0 18px' }}>Apni basic details bhejo. Manager dekhega aur access dega. Shop ki puri verification uske baad hogi.</p>
            <form className="adm-form" onSubmit={submit}>
              <div className="dl-form-grid">
                <div><label className="adm-label" htmlFor="bs-name">Your name</label><input id="bs-name" className="adm-input" required maxLength={80} value={f.name} onChange={set('name')} /></div>
                <div><label className="adm-label" htmlFor="bs-email">Email</label><input id="bs-email" className="adm-input" type="email" required value={f.email} onChange={set('email')} /></div>
                <div><label className="adm-label" htmlFor="bs-phone">Mobile (optional)</label><input id="bs-phone" className="adm-input" inputMode="numeric" maxLength={10} pattern="[6-9][0-9]{9}" value={f.phone} onChange={set('phone')} /></div>
                <div><label className="adm-label" htmlFor="bs-city">City</label><input id="bs-city" className="adm-input" maxLength={80} value={f.city} onChange={set('city')} /></div>
                <div className="dl-full"><label className="adm-label" htmlFor="bs-shop">Shop name</label><input id="bs-shop" className="adm-input" maxLength={120} value={f.shopName} onChange={set('shopName')} /></div>
                <div className="dl-full"><label className="adm-label" htmlFor="bs-sells">What will you sell?</label><input id="bs-sells" className="adm-input" maxLength={300} placeholder="e.g. Laptops, mobiles" value={f.sells} onChange={set('sells')} /></div>
                <div className="dl-full"><label className="adm-label" htmlFor="bs-msg">Message for the manager (optional)</label><textarea id="bs-msg" className="adm-textarea" rows={3} maxLength={1000} value={f.message} onChange={set('message')} /></div>
              </div>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={set('website')} style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} />
              {error && <div className="dl-banner bad" role="alert" style={{ marginBottom: 0 }}><div>{error}</div></div>}
              <button className="adm-btn block" style={{ height: 48 }} disabled={busy}>{busy ? 'Sending...' : 'SEND REQUEST'}</button>
              <p className="dl-hint" style={{ textAlign: 'center' }}>Already a seller? <Link to="/login" style={{ fontWeight: 700 }}>Log in</Link></p>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default BecomeSeller;
