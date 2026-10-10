import { useRef } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineShieldCheck, HiOutlineTruck, HiOutlineGift, HiOutlineEye, HiOutlineEyeOff,
} from 'react-icons/hi';
import { useState } from 'react';
import './auth.css';

/* Split-screen premium shell used by Login / OTP / Forgot password / Signup */
export const AuthShell = ({ heading, lead, title, subtitle, children, footer }) => (
  <motion.div
    className="auth-shell"
    initial={{ opacity: 0, y: 22, scale: 0.985 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
  >
    <aside className="auth-side">
      <div className="auth-brand"><i>★</i> Flipkart</div>
      <div>
        <h2>{heading}</h2>
        <p className="lead">{lead}</p>
        <ul className="auth-points">
          <li><span><HiOutlineTruck className="w-5 h-5" /></span> Fast, free delivery on your first order</li>
          <li><span><HiOutlineShieldCheck className="w-5 h-5" /></span> 100% secure sign-in with OTP</li>
          <li><span><HiOutlineGift className="w-5 h-5" /></span> Exclusive member-only offers</li>
        </ul>
      </div>
      <div style={{ position: 'relative', zIndex: 1, fontSize: 12, opacity: 0.7 }}>© Flipkart Clone</div>
    </aside>
    <section className="auth-main">
      <h1>{title}</h1>
      <p className="sub">{subtitle}</p>
      {children}
      {footer && <div className="auth-foot">{footer}</div>}
    </section>
  </motion.div>
);

/* Floating-label input with icon (+ show/hide for passwords) */
export const Field = ({ icon: Icon, label, type = 'text', value, onChange, ...rest }) => {
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  return (
    <div className="auth-field">
      <input
        {...rest}
        type={isPw && show ? 'text' : type}
        value={value}
        onChange={onChange}
        placeholder=" "
      />
      <label>{label}</label>
      {Icon && <Icon className="ico" />}
      {isPw && (
        <button type="button" className="auth-eye" onClick={() => setShow(!show)} aria-label="Show or hide password">
          {show ? <HiOutlineEyeOff /> : <HiOutlineEye />}
        </button>
      )}
    </div>
  );
};

/* 6-box OTP input: auto-advance, backspace, paste */
export const OtpBoxes = ({ value, onChange }) => {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const set = (i, ch) => {
    const arr = digits.slice();
    arr[i] = ch;
    onChange(arr.join('').slice(0, 6));
  };
  const onInput = (i, e) => {
    const v = e.target.value.replace(/\D/g, '');
    if (!v) return set(i, '');
    set(i, v[v.length - 1]);
    if (i < 5) refs.current[i + 1]?.focus();
  };
  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
      set(i - 1, '');
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };
  const onPaste = (e) => {
    const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!t) return;
    e.preventDefault();
    onChange(t);
    refs.current[Math.min(t.length, 5)]?.focus();
  };

  return (
    <div className="auth-otp" onPaste={onPaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          placeholder=" "
          onChange={(e) => onInput(i, e)}
          onKeyDown={(e) => onKey(i, e)}
          onFocus={(e) => e.target.select()}
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}
    </div>
  );
};

export const Spinner = () => <span className="auth-spin" />;

/* simple 0-3 password strength */
export const strengthOf = (pw) => {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 8 && /[A-Z]/.test(pw) && /\d/.test(pw)) s++;
  if (pw.length >= 10 && /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};
