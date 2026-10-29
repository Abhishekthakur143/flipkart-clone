import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineEye, HiOutlineEyeOff, HiOutlineMoon, HiOutlineSun,
  HiOutlineLightningBolt, HiOutlineShieldCheck, HiOutlineCash,
} from 'react-icons/hi';
import { dv, errMsg, tokenStore } from './deliveryApi';
import { useDvTheme } from './ui';
import './delivery.css';

// Seedha register nahi hota: /delivery/join par apply karo, manager review karta hai, admin approve karta hai
const DeliveryAuth = () => {
  const navigate = useNavigate();
  const [theme, toggleTheme] = useDvTheme();
  const [f, setF] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (tokenStore.get()) return <Navigate to="/delivery" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await dv.login({ email: f.email, password: f.password });
      tokenStore.set(data.token);
      toast.success('Welcome back!');
      navigate('/delivery', { replace: true });
    } catch (err) {
      setError(errMsg(err, 'Could not connect to the server'));
    }
    setBusy(false);
  };

  return (
    <div className="dv-root" data-theme={theme}>
      <div className="dv-auth">
        <aside className="dv-auth-art">
          <div className="dv-logo" style={{ padding: 0 }}><i>★</i> Flipkart Delivery</div>
          <div>
            <h2>Deliver more.<br />Earn every day.</h2>
            <p className="lead">Your orders, routes, customer OTP and earnings: everything a delivery partner needs in one place.</p>
            <ul className="dv-auth-pts">
              <li><span><HiOutlineLightningBolt /></span> Live order queue with one-tap status updates</li>
              <li><span><HiOutlineShieldCheck /></span> Secure OTP-verified handover to the customer</li>
              <li><span><HiOutlineCash /></span> Track your daily and weekly earnings</li>
            </ul>
          </div>
          <small style={{ opacity: 0.6 }}>Partner app</small>
        </aside>

        <main className="dv-auth-form">
          <div className="dv-auth-box">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <button className="dv-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'dark' ? <HiOutlineSun /> : <HiOutlineMoon />}
              </button>
            </div>
            <h1>Partner login</h1>
            <p className="sub">Sign in to see your assigned orders.</p>

            <form className="dv-form" onSubmit={submit}>
              <div className="dv-field">
                <label>Email</label>
                <input className="dv-input" type="email" required value={f.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
              </div>
              <div className="dv-field">
                <label>Password</label>
                <div className="dv-eyewrap">
                  <input className="dv-input" type={show ? 'text' : 'password'} required minLength={6} value={f.password} onChange={set('password')}
                    placeholder="Your password" autoComplete="current-password" />
                  <button type="button" className="dv-eye" onClick={() => setShow(!show)} aria-label="Show or hide password">
                    {show ? <HiOutlineEyeOff size={20} /> : <HiOutlineEye size={20} />}
                  </button>
                </div>
              </div>

              {error && <div className="dv-err" role="alert">{error}</div>}
              <button className="dv-btn block" disabled={busy}>
                {busy && <span className="dv-spin" />}
                {busy ? 'Please wait...' : 'Login'}
              </button>
            </form>

            <div className="dv-auth-foot">
              New here? Apply to become a delivery partner. Accounts are created after approval.
              <div style={{ marginTop: 10 }}><Link to="/delivery/join" style={{ color: 'var(--dv-brand, #2874f0)', fontWeight: 700 }}>Apply to join →</Link></div>
              <div style={{ marginTop: 10 }}><Link to="/" style={{ color: 'var(--dv-muted)', fontWeight: 600 }}>← Back to shop</Link></div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DeliveryAuth;