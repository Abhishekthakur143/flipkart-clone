import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  HiOutlineArrowLeft,
  HiOutlineExclamationCircle,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineKey,
  HiOutlineLockClosed,
  HiOutlineLogout,
  HiOutlineQuestionMarkCircle,
  HiOutlineRefresh,
} from 'react-icons/hi';
import API from '../../utils/api';
import './AdminUnlock.css';

const PRESETS = [
  'What was the name of your first school?',
  "What is your favourite teacher's name?",
  'Which city did you grow up in?',
  'What was your first phone model?',
];
const CUSTOM = '__custom';

// Har tumbler ka resting height alag hota hai, jaise asli lock me
const DROP = [20, 34, 12];
const PIN_X = [70, 180, 290];
const CHECK_LABELS = ['Password', 'Code word', 'Security answer'];

const COPY = {
  checking: { title: 'Checking admin security', lead: 'One moment.' },
  error: {
    title: "Can't reach the server",
    lead: 'The panel stays locked until the server answers. Nothing was changed.',
  },
  locked: {
    title: "Confirm it's you",
    lead: (m) =>
      `Admin tools change prices, orders and customers. Enter all three details to open the panel for ${m} minutes.`,
  },
  setup: {
    title: 'Set up your admin lock',
    lead: () =>
      'Choose a code word and a security question only you can answer. From now on the panel asks for them together with your password.',
  },
};

const Lock = ({ pins, opened }) => (
  <svg className={`au-lock ${opened ? 'au-open' : ''}`} viewBox="0 0 360 254" role="img" aria-hidden="true">
    <rect className="au-housing" x="14" y="14" width="332" height="226" rx="22" />
    <path className="au-plug" d="M14 118 H346 V218 a22 22 0 0 1 -22 22 H36 a22 22 0 0 1 -22 -22 Z" />
    {PIN_X.map((cx, i) => (
      <g key={cx}>
        <rect className="au-chamber" x={cx - 26} y="30" width="52" height="196" rx="10" />
        <path
          className="au-spring"
          d={`M${cx - 12} 40 l24 6 l-24 6 l24 6 l-24 6 l24 6 l-24 6`}
        />
        <g className={`au-stack ${pins[i] ? 'on' : ''}`} style={{ '--drop': `${DROP[i]}px` }}>
          <rect className="au-driver" x={cx - 16} y="84" width="32" height="34" rx="4" />
          <path className="au-key" d={`M${cx - 16} 118 h32 v38 l-6 14 h-20 l-6 -14 Z`} />
        </g>
      </g>
    ))}
    <line className="au-shear" x1="14" x2="346" y1="118" y2="118" />
  </svg>
);

const Secret = ({ id, label, eyeName, icon: Icon, value, onChange, autoComplete = 'off', autoFocus, hint }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="au-field">
      <label htmlFor={id}>{label}</label>
      <div className="au-input">
        <Icon aria-hidden="true" />
        <input
          id={id}
          name={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <button
          type="button"
          className="au-eye"
          onClick={() => setShow((s) => !s)}
          aria-label={`${show ? 'Hide' : 'Show'} ${eyeName || label.toLowerCase()}`}
        >
          {show ? <HiOutlineEyeOff /> : <HiOutlineEye />}
        </button>
      </div>
      {hint && <p className="au-hint">{hint}</p>}
    </div>
  );
};

const signOut = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// mode: checking | error | locked | setup
const AdminUnlock = ({ mode, question = '', minutes = 30, lockedUntil = null, onSuccess, onRetry }) => {
  const user = useSelector((s) => s.auth.user);
  const isSetup = mode === 'setup';
  const isForm = mode === 'locked' || isSetup;

  const [password, setPassword] = useState('');
  const [codeWord, setCodeWord] = useState('');
  const [codeWord2, setCodeWord2] = useState('');
  const [answer, setAnswer] = useState('');
  const [preset, setPreset] = useState(PRESETS[0]);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const finalQuestion = preset === CUSTOM ? custom.trim() : preset;

  const pins = !isForm
    ? [false, false, false]
    : isSetup
    ? [
        password.length > 0,
        codeWord.trim().length >= 6 && codeWord.trim() === codeWord2.trim(),
        answer.trim().length >= 2 && finalQuestion.length >= 5,
      ]
    : [password.length > 0, codeWord.trim().length > 0, answer.trim().length > 0];
  const ready = pins.every(Boolean);

  const lockedMs = lockedUntil ? new Date(lockedUntil).getTime() - Date.now() : 0;
  const lockedNow = lockedMs > 0;
  const lockedMins = Math.max(Math.ceil(lockedMs / 60000), 1);

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || busy || opened || lockedNow) return;
    setBusy(true);
    setError('');
    try {
      const { data } = isSetup
        ? await API.post('/admin/security/setup', { password, codeWord, question: finalQuestion, answer })
        : await API.post('/admin/security/unlock', { password, codeWord, answer });
      setOpened(true);
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      timer.current = setTimeout(() => onSuccess(data), reduce ? 0 : 750);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not verify. Check your connection and try again.');
      setBusy(false);
    }
  };

  const copy = COPY[mode] || COPY.checking;
  const lead = typeof copy.lead === 'function' ? copy.lead(minutes) : copy.lead;
  const done = opened ? [true, true, true] : pins;

  return (
    <div className="au-root">
      <section className="au-side">
        <div className="au-brand">
          <span className="au-mark">★</span>
          <span>
            <b>Admin Panel</b>
            <small>Flipkart Clone</small>
          </span>
        </div>

        <Lock pins={done} opened={opened} />

        <div>
          <h1 className="au-title">{opened ? 'Panel unlocked' : copy.title}</h1>
          <p className="au-lead">{opened ? 'Opening the dashboard.' : lead}</p>
        </div>

        {isForm && (
          <ul className="au-checks" aria-label="Verification progress">
            {CHECK_LABELS.map((label, i) => (
              <li key={label} className={done[i] ? 'done' : ''}>
                <span className="au-dot" aria-hidden="true" />
                {label}
                <span className="au-sr">{done[i] ? ' entered' : ' missing'}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="au-note">
          Locks again after {minutes} minutes, or when you close this tab.
        </p>
      </section>

      <main className="au-main">
        <div className="au-panel">
          {mode === 'checking' && (
            <div className="au-boot" role="status">
              <span className="au-spin" />
              Checking admin security…
            </div>
          )}

          {mode === 'error' && (
            <div className="au-form">
              <div className="au-error" role="alert">
                <HiOutlineExclamationCircle aria-hidden="true" />
                <span>We couldn&apos;t reach the server. Check your connection, then try again.</span>
              </div>
              <button type="button" className="au-btn" onClick={onRetry}>
                <HiOutlineRefresh aria-hidden="true" /> Try again
              </button>
              <div className="au-links">
                <Link to="/" className="au-link">
                  <HiOutlineArrowLeft aria-hidden="true" /> Back to store
                </Link>
              </div>
            </div>
          )}

          {isForm && (
            <form className="au-form" onSubmit={submit} noValidate>
              <p className="au-who">
                Signed in as <b>{user?.name || user?.email || 'admin'}</b>
              </p>

              {lockedNow && (
                <div className="au-error" role="alert">
                  <HiOutlineExclamationCircle aria-hidden="true" />
                  <span>
                    Too many wrong attempts. Try again in {lockedMins} minute{lockedMins === 1 ? '' : 's'}.
                  </span>
                </div>
              )}

              <Secret
                id="au-password"
                label={isSetup ? 'Your admin password' : 'Password'}
                icon={HiOutlineLockClosed}
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                autoFocus
              />

              <Secret
                id="au-code"
                label="Secret code word"
                icon={HiOutlineKey}
                value={codeWord}
                onChange={setCodeWord}
                hint={isSetup ? 'At least 6 characters, and different from your password.' : undefined}
              />

              {isSetup && (
                <Secret
                  id="au-code2"
                  label="Confirm code word"
                  icon={HiOutlineKey}
                  value={codeWord2}
                  onChange={setCodeWord2}
                />
              )}

              {isSetup && (
                <div className="au-field">
                  <label htmlFor="au-question">Security question</label>
                  <select
                    id="au-question"
                    className="au-select"
                    value={preset}
                    onChange={(e) => setPreset(e.target.value)}
                  >
                    {PRESETS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                    <option value={CUSTOM}>Write my own question</option>
                  </select>
                </div>
              )}

              {isSetup && preset === CUSTOM && (
                <div className="au-field">
                  <label htmlFor="au-custom">Your question</label>
                  <div className="au-input">
                    <HiOutlineQuestionMarkCircle aria-hidden="true" />
                    <input
                      id="au-custom"
                      type="text"
                      value={custom}
                      maxLength={160}
                      onChange={(e) => setCustom(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </div>
              )}

              <Secret
                id="au-answer"
                label={isSetup ? 'Your answer' : question || 'Security answer'}
                eyeName="security answer"
                icon={HiOutlineQuestionMarkCircle}
                value={answer}
                onChange={setAnswer}
                hint={isSetup ? 'Capital letters and extra spaces are ignored.' : undefined}
              />

              <div className="au-error" role="alert" hidden={!error}>
                <HiOutlineExclamationCircle aria-hidden="true" />
                <span>{error}</span>
              </div>

              <button
                type="submit"
                className={`au-btn ${opened ? 'done' : ''}`}
                disabled={!ready || busy || opened || lockedNow}
              >
                {busy && !opened && <span className="au-spin" />}
                {opened ? 'Unlocked' : busy ? 'Verifying…' : isSetup ? 'Save and unlock' : 'Unlock panel'}
              </button>

              <div className="au-links">
                <Link to="/" className="au-link">
                  <HiOutlineArrowLeft aria-hidden="true" /> Back to store
                </Link>
                <button type="button" className="au-link" onClick={signOut}>
                  <HiOutlineLogout aria-hidden="true" /> Sign out
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminUnlock;
