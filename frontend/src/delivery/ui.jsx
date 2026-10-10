import { useEffect, useRef, useState } from 'react';
import { HiOutlineCheck } from 'react-icons/hi';

export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export const fmtTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

export const addressLine = (s = {}) =>
  [s.addressLine1, s.addressLine2, s.city, s.state, s.pincode].filter(Boolean).join(', ');

export const STEPS = ['Assigned', 'Picked Up', 'Out for Delivery', 'Delivered'];

export const STATUS_TONE = {
  Assigned: 'blue',
  'Picked Up': 'amber',
  'Out for Delivery': 'violet',
  Delivered: 'green',
  Failed: 'red',
};

export const Badge = ({ status }) => (
  <span className={`dv-badge ${STATUS_TONE[status] || 'blue'}`}>{status}</span>
);

export const Stepper = ({ status }) => {
  const idx = STEPS.indexOf(status);
  const failed = status === 'Failed';
  return (
    <div className="dv-stepper">
      {STEPS.map((s, i) => {
        const done = !failed && i <= idx;
        return (
          <div key={s} className={`dv-step ${done ? 'done' : ''} ${!failed && i === idx ? 'now' : ''}`}>
            <span className="dot">{done && i < idx ? <HiOutlineCheck /> : i + 1}</span>
            <small>{s}</small>
          </div>
        );
      })}
    </div>
  );
};

export const StatCard = ({ icon: Icon, label, value, hint, tone = 'blue' }) => (
  <div className={`dv-stat ${tone}`}>
    <div className="ico"><Icon /></div>
    <div>
      <p>{label}</p>
      <h3>{value}</h3>
      {hint && <small>{hint}</small>}
    </div>
  </div>
);

export const Empty = ({ icon: Icon, title, text }) => (
  <div className="dv-empty">
    {Icon && <div className="ico"><Icon /></div>}
    <h4>{title}</h4>
    <p>{text}</p>
  </div>
);

export const Skeleton = ({ h = 90, n = 3 }) => (
  <>{Array.from({ length: n }).map((_, i) => <div key={i} className="dv-skel" style={{ height: h }} />)}</>
);

/* ---------- Weekly bar chart (plain SVG, no extra packages) ---------- */
export const WeeklyChart = ({ data = [] }) => {
  const [mode, setMode] = useState('earnings');
  const [hover, setHover] = useState(null);
  const W = 560, H = 230, pad = { l: 40, r: 12, t: 16, b: 30 };
  const vals = data.map((d) => d[mode]);
  const max = Math.max(1, ...vals);
  const nice = mode === 'delivered' ? Math.max(4, Math.ceil(max / 2) * 2) : Math.max(100, Math.ceil(max / 50) * 50);
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const bw = iw / Math.max(1, data.length);
  const ticks = [0, 0.5, 1].map((t) => Math.round(nice * t));

  return (
    <div className="dv-chart">
      <div className="dv-chart-head">
        <div>
          <h4>Last 7 days</h4>
          <small>{mode === 'earnings' ? 'Your earnings per day' : 'Deliveries completed per day'}</small>
        </div>
        <div className="dv-seg">
          <button className={mode === 'earnings' ? 'on' : ''} onClick={() => setMode('earnings')}>Earnings</button>
          <button className={mode === 'delivered' ? 'on' : ''} onClick={() => setMode('delivered')}>Deliveries</button>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weekly chart" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="dvbar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--dv-accent)" />
            <stop offset="100%" stopColor="var(--dv-accent2)" />
          </linearGradient>
        </defs>
        {ticks.map((t) => {
          const y = pad.t + ih - (t / nice) * ih;
          return (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--dv-line)" strokeDasharray="4 5" />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--dv-muted)">
                {mode === 'earnings' ? '₹' + t : t}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d[mode] / nice) * ih;
          const x = pad.l + i * bw + bw * 0.2;
          const w = bw * 0.6;
          const y = pad.t + ih - h;
          const on = hover === i;
          return (
            <g key={d.key} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} style={{ cursor: 'pointer' }}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={ih} fill="transparent" />
              <rect x={x} y={d[mode] ? y : pad.t + ih - 3} width={w} height={d[mode] ? h : 3} rx="7"
                fill={d[mode] ? 'url(#dvbar)' : 'var(--dv-line)'} opacity={hover === null || on ? 1 : 0.45}
                style={{ transition: 'opacity .2s' }} />
              <text x={x + w / 2} y={H - 9} textAnchor="middle" fontSize="11.5" fill={on ? 'var(--dv-text)' : 'var(--dv-muted)'}>{d.label}</text>
              {on && (
                <g>
                  <rect x={Math.min(Math.max(x + w / 2 - 54, 2), W - 112)} y={Math.max(y - 46, 0)} width="108" height="38" rx="9" fill="var(--dv-tip)" />
                  <text x={Math.min(Math.max(x + w / 2, 56), W - 58)} y={Math.max(y - 30, 16)} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--dv-tip-text)">
                    {mode === 'earnings' ? inr(d.earnings) : `${d.delivered} delivered`}
                  </text>
                  <text x={Math.min(Math.max(x + w / 2, 56), W - 58)} y={Math.max(y - 15, 31)} textAnchor="middle" fontSize="10.5" fill="var(--dv-tip-text)" opacity=".75">
                    {mode === 'earnings' ? `${d.delivered} delivered` : inr(d.earnings)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ---------- 6 box OTP input (auto advance, backspace, paste) ---------- */
export const DvOtp = ({ value, onChange }) => {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');
  const set = (i, ch) => { const a = digits.slice(); a[i] = ch; onChange(a.join('').slice(0, 6)); };
  return (
    <div className="dv-otp" onPaste={(e) => {
      const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      if (!t) return;
      e.preventDefault(); onChange(t); refs.current[Math.min(t.length, 5)]?.focus();
    }}>
      {digits.map((d, i) => (
        <input key={i} ref={(el) => (refs.current[i] = el)} value={d} inputMode="numeric" maxLength={1}
          autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={`OTP digit ${i + 1}`}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            if (!v) return set(i, '');
            set(i, v[v.length - 1]);
            if (i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i] && i > 0) { refs.current[i - 1]?.focus(); set(i - 1, ''); }
          }} />
      ))}
    </div>
  );
};

/* ---------- theme (own toggle, independent from the shop's dark mode) ---------- */
export const useDvTheme = () => {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('deliveryTheme') || 'dark'; } catch { return 'dark'; }
  });
  useEffect(() => {
    try { localStorage.setItem('deliveryTheme', theme); } catch { /* ignore */ }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
};
