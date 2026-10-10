const crypto = require('crypto');
const jwt = require('jsonwebtoken');
let bcrypt;
try { bcrypt = require('bcryptjs'); } catch { bcrypt = require('bcrypt'); }

const User = require('../models/User');          // ADAPT: path/name of your user model
const Otp = require('../models/Otp');
const sendOtpEmail = require('../utils/sendOtpEmail');

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashOtp = (email, purpose, otp) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET || 'otp-secret')
    .update(`${email}:${purpose}:${otp}`).digest('hex');

// ADAPT: use the same token logic as your normal login
const signToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const safeUser = (u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role });

async function verifyOtp(email, purpose, otp) {
  const rec = await Otp.findOne({ email, purpose });
  if (!rec || rec.expiresAt < new Date()) return { ok: false, msg: 'OTP expired. Please request a new one.' };
  if (rec.attempts >= MAX_ATTEMPTS) {
    await rec.deleteOne();
    return { ok: false, msg: 'Too many wrong attempts. Please request a new OTP.' };
  }
  const given = Buffer.from(hashOtp(email, purpose, String(otp).trim()));
  const real = Buffer.from(rec.otpHash);
  if (given.length !== real.length || !crypto.timingSafeEqual(given, real)) {
    rec.attempts += 1;
    await rec.save();
    return { ok: false, msg: `Wrong OTP. ${MAX_ATTEMPTS - rec.attempts} attempts left.` };
  }
  await rec.deleteOne();   // one-time use
  return { ok: true };
}

// POST /send  { email, purpose: 'login' | 'reset' }
exports.sendOtp = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const purpose = req.body.purpose;
    if (!EMAIL_RE.test(email)) return res.status(400).json({ success: false, message: 'Enter a valid email' });
    if (!['login', 'reset'].includes(purpose)) return res.status(400).json({ success: false, message: 'Invalid request' });

    const generic = { success: true, message: 'If this email is registered, an OTP has been sent.' };

    const user = await User.findOne({ email });
    if (!user) return res.json(generic);   // do not reveal which emails exist

    const last = await Otp.findOne({ email, purpose }).sort({ createdAt: -1 });
    if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - last.createdAt.getTime())) / 1000);
      return res.status(429).json({ success: false, message: `Please wait ${wait}s before requesting another OTP.` });
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    await Otp.deleteMany({ email, purpose });
    await Otp.create({ email, purpose, otpHash: hashOtp(email, purpose, otp), expiresAt: new Date(Date.now() + OTP_TTL_MS) });
    await sendOtpEmail(email, otp, purpose);

    res.json(generic);
  } catch (err) {
    console.error('sendOtp error:', err.message);
    res.status(500).json({ success: false, message: 'Could not send OTP. Try again.' });
  }
};

// POST /login  { email, otp }
exports.loginWithOtp = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const { otp } = req.body;
    if (!EMAIL_RE.test(email) || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const v = await verifyOtp(email, 'login', otp);
    if (!v.ok) return res.status(400).json({ success: false, message: v.msg });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: 'Account not found' });

    res.json({ success: true, token: signToken(user), user: safeUser(user) });
  } catch (err) {
    console.error('loginWithOtp error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /reset-password  { email, otp, newPassword }
exports.resetPassword = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const { otp, newPassword } = req.body;
    if (!EMAIL_RE.test(email) || !otp || !newPassword)
      return res.status(400).json({ success: false, message: 'Email, OTP and new password are required' });
    if (String(newPassword).length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const v = await verifyOtp(email, 'reset', otp);
    if (!v.ok) return res.status(400).json({ success: false, message: v.msg });

    // updateOne skips any pre('save') hook, so we hash here ourselves (ADAPT field name if not "password")
    const hash = await bcrypt.hash(String(newPassword), 10);
    const r = await User.updateOne({ email }, { $set: { password: hash } });
    if (!r.matchedCount) return res.status(400).json({ success: false, message: 'Account not found' });

    res.json({ success: true, message: 'Password updated. You can log in now.' });
  } catch (err) {
    console.error('resetPassword error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
