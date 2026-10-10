import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { verifyEmail } from '../redux/slices/authSlice';
import toast from 'react-hot-toast';
import { AuthShell, Spinner } from '../components/AuthShell';
import '../components/auth-extra.css';

const LENGTH = 6;

const VerifyEmail = () => {
  const [digits, setDigits] = useState(Array(LENGTH).fill(''));
  const [busy, setBusy] = useState(false);
  const refs = useRef([]);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const otp = digits.join('');

  // typed ya autofill hui digits ko index se aage bhar do
  const fillFrom = (start, raw) => {
    const chars = raw.replace(/\D/g, '').slice(0, LENGTH - start).split('');
    if (!chars.length) return;
    const next = [...digits];
    chars.forEach((c, k) => { next[start + k] = c; });
    setDigits(next);
    refs.current[Math.min(start + chars.length, LENGTH - 1)]?.focus();
  };

  const handleChange = (i, value) => {
    if (value === '') {
      const next = [...digits];
      next[i] = '';
      setDigits(next);
      return;
    }
    fillFrom(i, value);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      const next = [...digits];
      next[i - 1] = '';
      setDigits(next);
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < LENGTH - 1) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    fillFrom(0, e.clipboardData.getData('text'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const result = await dispatch(verifyEmail(otp));
    setBusy(false);
    if (verifyEmail.fulfilled.match(result)) {
      toast.success('Email Verified!');
      navigate('/');
    } else {
      toast.error('Invalid OTP');
    }
  };

  return (
    <AuthShell
      heading="Almost there"
      lead="One last step to secure your account and start shopping."
      title="Verify your email"
      subtitle="Enter the 6-digit OTP sent to your email address."
      footer={<>Wrong email? <Link to="/register" className="auth-link">Sign up again</Link></>}
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="otp-row" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={LENGTH}
              value={d}
              autoFocus={i === 0}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              className={`otp-box ${d ? 'filled' : ''}`}
              aria-label={`OTP digit ${i + 1}`}
            />
          ))}
        </div>
        <button type="submit" className="auth-btn" disabled={busy || otp.length < LENGTH}>
          {busy && <Spinner />}{busy ? 'Verifying...' : 'VERIFY'}
        </button>
      </form>
    </AuthShell>
  );
};

export default VerifyEmail;