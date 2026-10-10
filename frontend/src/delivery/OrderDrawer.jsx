import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  HiOutlineX, HiOutlinePhone, HiOutlineLocationMarker, HiOutlineCash, HiOutlineCheckCircle,
  HiOutlineTruck, HiOutlineArchive, HiOutlineExclamationCircle, HiOutlineRefresh,
} from 'react-icons/hi';
import { dv, errMsg } from './deliveryApi';
import { Badge, Stepper, DvOtp, inr, fmtTime, addressLine } from './ui';

const REASONS = [
  'Customer not available',
  'Customer not reachable',
  'Wrong or incomplete address',
  'Customer refused the order',
  'Payment not available (COD)',
  'Other',
];

const OrderDrawer = ({ order, onClose, onChanged }) => {
  const [busy, setBusy] = useState('');
  const [otp, setOtp] = useState('');
  const [failing, setFailing] = useState(false);
  const [reason, setReason] = useState('');
  const [wait, setWait] = useState(0);
  const [otpError, setOtpError] = useState('');

  const st = order.delivery.status;
  const s = order.shippingInfo;
  const addr = addressLine(s);
  const q = encodeURIComponent(addr);

  // lock page scroll + Esc to close
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  // resend cooldown
  useEffect(() => {
    if (st !== 'Out for Delivery') return;
    const sent = order.delivery.otpSentAt ? new Date(order.delivery.otpSentAt).getTime() : 0;
    setWait(Math.max(0, 30 - Math.floor((Date.now() - sent) / 1000)));
  }, [order.delivery.otpSentAt, st]);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const act = async (key, fn, after) => {
    setBusy(key);
    try {
      const r = await fn();
      toast.success(r.message || 'Done');
      after?.(r);
      await onChanged();
    } catch (e) {
      const m = errMsg(e);
      if (key === 'deliver') setOtpError(m); else toast.error(m);
    }
    setBusy('');
  };

  const pickup = () => act('pickup', () => dv.pickup(order._id));
  const start = () => act('start', () => dv.outForDelivery(order._id), () => { setWait(30); setOtp(''); setOtpError(''); });
  const resend = () => act('resend', () => dv.resendOtp(order._id), () => { setWait(30); setOtp(''); setOtpError(''); });
  const deliver = () => { setOtpError(''); act('deliver', () => dv.deliver(order._id, otp)); };
  const fail = () => act('fail', () => dv.fail(order._id, reason), () => { setFailing(false); setReason(''); });

  return (
    <>
      <motion.div className="dv-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside className="dv-drawer" role="dialog" aria-label={`Order ${order.code}`}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
        <div className="dv-d-head">
          <div className="grow">
            <h3>Order #{order.code}</h3>
            <small style={{ color: 'var(--dv-muted)' }}>Assigned {fmtTime(order.delivery.assignedAt)}</small>
          </div>
          <Badge status={st} />
          <button className="dv-icon-btn" onClick={onClose} aria-label="Close"><HiOutlineX /></button>
        </div>

        <div className="dv-d-body">
          <div className="dv-box"><Stepper status={st} /></div>

          {order.amountToCollect > 0 && st !== 'Failed' && (
            <div className="dv-cod">
              <div className="ico"><HiOutlineCash /></div>
              <div><p>COLLECT CASH FROM CUSTOMER</p><h3>{inr(order.amountToCollect)}</h3></div>
            </div>
          )}
          {order.paymentMethod === 'Online' && st !== 'Delivered' && st !== 'Failed' && (
            <div className="dv-paid"><HiOutlineCheckCircle size={20} /> Already paid online. Nothing to collect.</div>
          )}
          {st === 'Delivered' && (
            <div className="dv-paid">
              <HiOutlineCheckCircle size={20} />
              Delivered {fmtTime(order.delivery.deliveredAt)} · You earned {inr(order.delivery.payout)}
              {order.delivery.codCollected > 0 && <> · Cash collected {inr(order.delivery.codCollected)}</>}
            </div>
          )}
          {st === 'Failed' && (
            <div className="dv-err" style={{ display: 'flex', gap: 10 }}>
              <HiOutlineExclamationCircle size={20} style={{ flex: 'none' }} />
              <span>Delivery failed {fmtTime(order.delivery.failedAt)}: {order.delivery.failReason}. Support will reassign this order.</span>
            </div>
          )}

          <div className="dv-box">
            <h5>Customer</h5>
            <div className="dv-cust">
              <span className="dv-avatar">{s.name?.charAt(0)?.toUpperCase()}</span>
              <div><b>{s.name}</b><small>{s.phone}</small></div>
              <span className={`dv-pill ${order.paymentMethod === 'COD' ? 'cod' : ''}`} style={{ marginLeft: 'auto' }}>
                {order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Prepaid'}
              </span>
            </div>
            <p className="dv-addr"><HiOutlineLocationMarker style={{ verticalAlign: '-3px', marginRight: 4 }} />{addr}</p>
            <div className="dv-actions">
              <a className="dv-link" href={`tel:${s.phone}`}><HiOutlinePhone /> Call customer</a>
              <a className="dv-link" href={`https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving`} target="_blank" rel="noreferrer">
                <HiOutlineLocationMarker /> Navigate
              </a>
            </div>
          </div>

          <div className="dv-box">
            <h5>Delivery location</h5>
            <iframe className="dv-map" title="Delivery location map" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${q}&output=embed`} />
          </div>

          <div className="dv-box">
            <h5>Package ({order.items.reduce((n, i) => n + i.quantity, 0)} item{order.items.reduce((n, i) => n + i.quantity, 0) > 1 ? 's' : ''})</h5>
            <div className="dv-items">
              {order.items.map((i, k) => (
                <div className="dv-item" key={k}>
                  <img src={i.image} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                  <div>
                    <b>{i.name}</b>
                    <small>Qty {i.quantity}{i.size ? ` · ${i.size}` : ''}{i.color ? ` · ${i.color}` : ''}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---- action footer ---- */}
        {st === 'Assigned' && (
          <div className="dv-d-foot">
            <button className="dv-btn block" onClick={pickup} disabled={!!busy}>
              {busy === 'pickup' ? <span className="dv-spin" /> : <HiOutlineArchive />} Mark as picked up
            </button>
          </div>
        )}
        {st === 'Picked Up' && (
          <div className="dv-d-foot">
            <p className="dv-note">Starting the delivery emails a 6-digit OTP to the customer. You will need it at handover.</p>
            <button className="dv-btn blue block" onClick={start} disabled={!!busy}>
              {busy === 'start' ? <span className="dv-spin" /> : <HiOutlineTruck />} Start delivery
            </button>
          </div>
        )}
        {st === 'Out for Delivery' && !failing && (
          <div className="dv-d-foot">
            <p className="dv-note"><b style={{ color: 'var(--dv-text)' }}>Ask the customer for the OTP</b> sent to their email, and enter it to complete the delivery.</p>
            <DvOtp value={otp} onChange={(v) => { setOtp(v); setOtpError(''); }} />
            {otpError && <div className="dv-err" role="alert">{otpError}</div>}
            <button className="dv-btn block" onClick={deliver} disabled={!!busy || otp.length !== 6}>
              {busy === 'deliver' ? <span className="dv-spin" /> : <HiOutlineCheckCircle />} Confirm delivery
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="dv-textlink" onClick={resend} disabled={wait > 0 || !!busy}>
                <HiOutlineRefresh style={{ verticalAlign: '-3px' }} /> {wait > 0 ? `Resend OTP in ${wait}s` : 'Resend OTP'}
              </button>
              <button className="dv-textlink" style={{ color: 'var(--dv-danger)' }} onClick={() => setFailing(true)}>Can't deliver?</button>
            </div>
          </div>
        )}
        {st === 'Out for Delivery' && failing && (
          <div className="dv-d-foot">
            <p className="dv-note"><b style={{ color: 'var(--dv-text)' }}>Why could you not deliver?</b></p>
            <div className="dv-reasons">
              {REASONS.map((r) => (
                <button key={r} type="button" className={`dv-reason ${reason === r ? 'on' : ''}`} onClick={() => setReason(r)}>{r}</button>
              ))}
            </div>
            <div className="dv-actions" style={{ marginTop: 0 }}>
              <button className="dv-btn ghost" onClick={() => setFailing(false)}>Back</button>
              <button className="dv-btn danger" onClick={fail} disabled={!reason || !!busy}>
                {busy === 'fail' && <span className="dv-spin" />} Mark failed
              </button>
            </div>
          </div>
        )}
      </motion.aside>
    </>
  );
};

export default OrderDrawer;
