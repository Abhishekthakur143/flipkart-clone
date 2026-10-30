import { useState } from 'react';
import {
  HiOutlineStar,
  HiOutlineTruck,
  HiOutlineShieldCheck,
  HiOutlineGift,
  HiOutlineEye,
  HiOutlineEyeOff,
} from 'react-icons/hi';
import './authsplit.css';

// Login / Register ke liye split layout:
// Left = blue panel (heading, lead, benefits), Right = form.
// Sirf design/layout. Form ki logic Login.jsx / Register.jsx me hi hai.

export const Spinner = () => <span className="as-spin" aria-hidden="true" />;

// Floating label wala input. Password par eye (show/hide) button.
export const Field = ({ icon: Icon, label, id, type = 'text', ...props }) => {
  const [show, setShow] = useState(false);
  const fid = id || `as-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  const isPw = type === 'password';
  return (
    <div className="as-field">
      <div className="as-input-wrap">
        {Icon && <Icon className="as-input-ico" />}
        <input
          id={fid}
          className={`as-input ${isPw ? 'has-eye' : ''}`}
          type={isPw && show ? 'text' : type}
          placeholder=" "
          {...props}
        />
        <label className="as-label" htmlFor={fid}>{label}</label>
        {isPw && (
          <button
            type="button"
            className="as-eye"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <HiOutlineEyeOff /> : <HiOutlineEye />}
          </button>
        )}
      </div>
    </div>
  );
};

const PERKS = [
  { Icon: HiOutlineTruck, text: 'Fast, free delivery on your first order' },
  { Icon: HiOutlineShieldCheck, text: '100% secure sign-in with OTP' },
  { Icon: HiOutlineGift, text: 'Exclusive member-only offers' },
];

export const AuthSplit = ({ heading, lead, title, subtitle, footer, children }) => (
  <div className="as-page">
    {/* Left: blue panel */}
    <aside className="as-side">
      <div className="as-brand">
        <span className="as-brand-mark"><HiOutlineStar /></span>
        <span className="as-brand-name">Flipkart</span>
      </div>

      <div className="as-copy">
        <h2 className="as-heading">{heading}</h2>
        <p className="as-lead">{lead}</p>
        <ul className="as-perks">
          {PERKS.map(({ Icon, text }) => (
            <li key={text}><span className="as-perk-ico"><Icon /></span>{text}</li>
          ))}
        </ul>
      </div>

      <p className="as-copyright">© Flipkart Clone</p>
    </aside>

    {/* Right: form */}
    <main className="as-main">
      <div className="as-card">
        <h1 className="as-title">{title}</h1>
        {subtitle && <p className="as-sub">{subtitle}</p>}
        {children}
        {footer && <div className="as-foot">{footer}</div>}
      </div>
    </main>
  </div>
);

export default AuthSplit;
