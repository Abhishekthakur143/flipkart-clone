import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineMoon, HiOutlineSun, HiOutlineCheckCircle,
  HiOutlineClipboardCheck, HiOutlineShieldCheck, HiOutlineCash,
} from 'react-icons/hi';
import API from '../utils/api';
import { useDvTheme } from './ui';
import './delivery.css';

const VEHICLES = ['Bike', 'Scooter', 'Cycle', 'EV'];
const EMPTY = {
  name: '', phone: '', email: '', city: '', address: '',
  vehicleType: 'Bike', vehicleNumber: '', licenseNumber: '', experience: '', message: '',
  website: '', // honeypot: insaan ko dikhta nahi, bots bhar dete hain
};

// Public form: koi bhi apply kar sakta hai. Manager review karta hai, admin yes/no bolta hai.
const DeliveryJoin = () => {
  const [theme, toggleTheme] = useDvTheme();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await API.post('/partner-requests', f);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not connect to the server');
    }
    setBusy(false);
  };

  const grid = { display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' };

  return (
    <div className="dv-root" data-theme={theme}>
      <div className="dv-auth">
        <aside className="dv-auth-art">
          <div className="dv-logo" style={{ padding: 0 }}><i>★</i> Flipkart Delivery</div>
          <div>
            <h2>Join our<br />delivery team.</h2>
            <p className="lead">Fill in your details once. Our manager reviews your application and the admin confirms it. You will get your login on email.</p>
            <ul className="dv-auth-pts">
              <li><span><HiOutlineClipboardCheck /></span> Simple form, no paperwork upfront</li>
              <li><span><HiOutlineShieldCheck /></span> Every partner is verified before joining</li>
              <li><span><HiOutlineCash /></span> Earn on every delivery you complete</li>
            </ul>
          </div>
          <small style={{ opacity: 0.6 }}>Partner app</small>
        </aside>

        <main className="dv-auth-form">
          <div className="dv-auth-box" style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <button className="dv-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'dark' ? <HiOutlineSun /> : <HiOutlineMoon />}
              </button>
            </div>

            {done ? (
              <div role="status" style={{ textAlign: 'center', padding: '24px 0' }}>
                <HiOutlineCheckCircle size={56} style={{ color: '#12b76a' }} />
                <h1>Application sent</h1>
                <p className="sub">Thanks, {f.name.split(' ')[0]}! Our manager will review your details and the admin will confirm. We will email you at <b>{f.email}</b> once a decision is made.</p>
                <div style={{ marginTop: 18 }}><Link to="/delivery/login" style={{ fontWeight: 700 }}>← Back to partner login</Link></div>
              </div>
            ) : (
              <>
                <h1>Apply as delivery partner</h1>
                <p className="sub">Tell us about yourself and your vehicle.</p>

                <form className="dv-form" onSubmit={submit}>
                  <div style={grid}>
                    <div className="dv-field">
                      <label htmlFor="dj-name">Full name</label>
                      <input id="dj-name" className="dv-input" required maxLength={50} value={f.name} onChange={set('name')} autoComplete="name" />
                    </div>
                    <div className="dv-field">
                      <label htmlFor="dj-phone">Mobile number</label>
                      <input id="dj-phone" className="dv-input" required inputMode="numeric" maxLength={10} pattern="[6-9][0-9]{9}" title="10-digit mobile number"
                        value={f.phone} onChange={set('phone')} placeholder="10-digit mobile" autoComplete="tel" />
                    </div>
                  </div>
                  <div style={grid}>
                    <div className="dv-field">
                      <label htmlFor="dj-email">Email</label>
                      <input id="dj-email" className="dv-input" type="email" required value={f.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
                    </div>
                    <div className="dv-field">
                      <label htmlFor="dj-city">City</label>
                      <input id="dj-city" className="dv-input" required maxLength={60} value={f.city} onChange={set('city')} autoComplete="address-level2" />
                    </div>
                  </div>
                  <div className="dv-field">
                    <label htmlFor="dj-address">Address (optional)</label>
                    <input id="dj-address" className="dv-input" maxLength={300} value={f.address} onChange={set('address')} autoComplete="street-address" />
                  </div>
                  <div style={grid}>
                    <div className="dv-field">
                      <label htmlFor="dj-vt">Vehicle</label>
                      <select id="dj-vt" className="dv-input" value={f.vehicleType} onChange={set('vehicleType')}>
                        {VEHICLES.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="dv-field">
                      <label htmlFor="dj-vn">Vehicle number</label>
                      <input id="dj-vn" className="dv-input" maxLength={20} value={f.vehicleNumber} onChange={set('vehicleNumber')} placeholder="MP09 AB 1234" />
                    </div>
                  </div>
                  <div style={grid}>
                    <div className="dv-field">
                      <label htmlFor="dj-dl">Driving licence no. (optional)</label>
                      <input id="dj-dl" className="dv-input" maxLength={30} value={f.licenseNumber} onChange={set('licenseNumber')} />
                    </div>
                    <div className="dv-field">
                      <label htmlFor="dj-exp">Experience (optional)</label>
                      <input id="dj-exp" className="dv-input" maxLength={120} value={f.experience} onChange={set('experience')} placeholder="e.g. 2 years food delivery" />
                    </div>
                  </div>
                  <div className="dv-field">
                    <label htmlFor="dj-msg">Anything else? (optional)</label>
                    <input id="dj-msg" className="dv-input" maxLength={500} value={f.message} onChange={set('message')} />
                  </div>

                  {/* Honeypot: screen par nahi dikhta */}
                  <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
                    <label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label>
                  </div>

                  {error && <div className="dv-err" role="alert">{error}</div>}
                  <button className="dv-btn block" disabled={busy}>
                    {busy && <span className="dv-spin" />}
                    {busy ? 'Sending...' : 'Submit application'}
                  </button>
                </form>

                <div className="dv-auth-foot">
                  Already approved? <Link to="/delivery/login" style={{ fontWeight: 700 }}>Partner login</Link>
                  <div style={{ marginTop: 10 }}><Link to="/" style={{ color: 'var(--dv-muted)', fontWeight: 600 }}>← Back to shop</Link></div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DeliveryJoin;
