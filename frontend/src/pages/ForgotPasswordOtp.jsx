import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineCheck } from 'react-icons/hi';
import API from '../utils/api';
import { AuthShell, Field, OtpBoxes, Spinner, strengthOf } from '../components/AuthShell';

const ForgotPasswordOtp = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const [done, setDone] = useState(false);
  const strength = strengthOf(pw);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const sendOtp = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await API.post('/otp/send', { email, purpose: 'reset' });
      setMsg({ ok: data.message });
      setStep(2);
      setWait(30);
    } catch (err) {
      setMsg({ err: err.response?.data?.message || 'Could not send OTP' });
    }
    setBusy(false);
  };

  const reset = async (e) => {
    e.preventDefault();
    if (pw !== pw2) return setMsg({ err: 'Passwords do not match' });
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await API.post('/otp/reset-password', { email, otp, newPassword: pw });
      setMsg({ ok: data.message });
      setDone(true);
    } catch (err) {
      setMsg({ err: err.response?.data?.message || 'Could not reset password' });
    }
    setBusy(false);
  };

  return (
    <AuthShell
      heading="Reset in a minute"
      lead="Verify your email with a one-time code, choose a new password, and you're back in."
      title={done ? 'All set!' : 'Forgot password'}
      subtitle={done ? 'Your password has been updated.' : step === 1 ? 'Enter your registered email to get an OTP.' : <>Code sent to <b>{email}</b></>}
      footer={!done && <Link to="/login" className="auth-link">Back to login</Link>}
    >
      {done ? (
        <div className="auth-success">
          <div className="tick"><HiOutlineCheck /></div>
          <Link to="/login" className="auth-btn" style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
            Go to login
          </Link>
        </div>
      ) : (
        <>
          <div className="auth-steps"><i className="on" /><i className={step === 2 ? 'on' : ''} /></div>

          {step === 1 ? (
            <form onSubmit={sendOtp} className="auth-form">
              <Field icon={HiOutlineMail} label="Registered email" type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="auth-btn" disabled={busy}>{busy && <Spinner />}{busy ? 'Sending...' : 'Send OTP'}</button>
            </form>
          ) : (
            <form onSubmit={reset} className="auth-form">
              <OtpBoxes value={otp} onChange={setOtp} />
              <Field icon={HiOutlineLockClosed} label="New password" type="password" required minLength={6} autoComplete="new-password"
                value={pw} onChange={(e) => setPw(e.target.value)} />
              {pw && <div className="auth-strength">{[1, 2, 3].map((n) => <i key={n} className={strength >= n ? `s${strength}` : ''} />)}</div>}
              <Field icon={HiOutlineLockClosed} label="Confirm new password" type="password" required minLength={6} autoComplete="new-password"
                value={pw2} onChange={(e) => setPw2(e.target.value)} />
              <button className="auth-btn" disabled={busy || otp.length !== 6}>
                {busy && <Spinner />}{busy ? 'Saving...' : 'Reset password'}
              </button>
              <div className="auth-row" style={{ justifyContent: 'center', gap: 16 }}>
                <button type="button" className="auth-link" disabled={wait > 0 || busy} onClick={sendOtp}>
                  {wait > 0 ? `Resend OTP in ${wait}s` : 'Resend OTP'}
                </button>
                <button type="button" className="auth-link" onClick={() => { setStep(1); setOtp(''); setMsg(null); }}>
                  Change email
                </button>
              </div>
            </form>
          )}
          {msg && <div className={`auth-msg ${msg.err ? 'err' : 'ok'}`} style={{ marginTop: 16 }}>{msg.err || msg.ok}</div>}
        </>
      )}
    </AuthShell>
  );
};

export default ForgotPasswordOtp;
