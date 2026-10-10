import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { HiOutlineMail } from 'react-icons/hi';
import API from '../utils/api';
import { loginWithOtp } from '../redux/slices/authSlice';
import { AuthShell, Field, OtpBoxes, Spinner } from '../components/AuthShell';

const OtpLogin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

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
      const { data } = await API.post('/otp/send', { email, purpose: 'login' });
      setMsg({ ok: data.message });
      setStep(2);
      setWait(30);
    } catch (err) {
      setMsg({ err: err.response?.data?.message || 'Could not send OTP' });
    }
    setBusy(false);
  };

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await dispatch(loginWithOtp({ email, otp })).unwrap();
      navigate('/');
    } catch (err) {
      setMsg({ err: typeof err === 'string' ? err : 'Login failed' });
      setBusy(false);
    }
  };

  return (
    <AuthShell
      heading="Password-free login"
      lead="Forgot your password? No problem. We'll email you a one-time code that signs you in securely."
      title="Login with OTP"
      subtitle={step === 1 ? 'We will email you a 6-digit code.' : <>Code sent to <b>{email}</b></>}
      footer={<Link to="/login" className="auth-link">Login with password instead</Link>}
    >
      <div className="auth-steps"><i className="on" /><i className={step === 2 ? 'on' : ''} /></div>

      {step === 1 ? (
        <form onSubmit={sendOtp} className="auth-form">
          <Field icon={HiOutlineMail} label="Email address" type="email" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="auth-btn" disabled={busy}>{busy && <Spinner />}{busy ? 'Sending...' : 'Send OTP'}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="auth-form">
          <OtpBoxes value={otp} onChange={setOtp} />
          <button className="auth-btn" disabled={busy || otp.length !== 6}>
            {busy && <Spinner />}{busy ? 'Verifying...' : 'Verify and login'}
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
    </AuthShell>
  );
};

export default OtpLogin;
