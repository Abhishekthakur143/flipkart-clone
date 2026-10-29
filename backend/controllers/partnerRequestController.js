const crypto = require('crypto');
const validator = require('validator');
const PartnerRequest = require('../models/PartnerRequest');
const DeliveryPartner = require('../models/DeliveryPartner');
const ErrorHandler = require('../utils/errorHandler');
const sendEmail = require('../utils/sendEmail');

const VEHICLES = ['Bike', 'Scooter', 'Cycle', 'EV'];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const genPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(10), (b) => chars[b % chars.length]).join('');
};

// Email fail ho to kaam na ruke (Vercel par SMTP kabhi atak sakta hai)
const tryMail = async (opts) => {
  try { await sendEmail(opts); return true; } catch (e) { console.error('Partner mail failed:', e.message); return false; }
};
const wrap = (title, body) =>
  `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto"><h2 style="color:#2874f0">${title}</h2>${body}</div>`;

// Form ka data saaf karke validate karta hai (public form aur manager ka add dono)
const clean = (b) => {
  const d = {
    name: String(b.name || '').trim(),
    email: String(b.email || '').toLowerCase().trim(),
    phone: String(b.phone || '').trim(),
    city: String(b.city || '').trim(),
    address: String(b.address || '').trim(),
    vehicleType: VEHICLES.includes(b.vehicleType) ? b.vehicleType : 'Bike',
    vehicleNumber: String(b.vehicleNumber || '').trim(),
    licenseNumber: String(b.licenseNumber || '').trim(),
    experience: String(b.experience || '').trim(),
    message: String(b.message || '').trim(),
  };
  if (!d.name) return { error: 'Please enter your full name' };
  if (!validator.isEmail(d.email)) return { error: 'Please enter a valid email' };
  if (!/^[6-9]\d{9}$/.test(d.phone)) return { error: 'Enter a valid 10-digit mobile number' };
  if (!d.city) return { error: 'Please enter your city' };
  return { data: d };
};

// Ek email se ek hi live request / partner ho sakta hai
const duplicateError = async (email) => {
  if (await DeliveryPartner.findOne({ email })) return 'A delivery partner account with this email already exists';
  if (await PartnerRequest.findOne({ email, status: { $in: ['Applied', 'Forwarded'] } })) {
    return 'An application with this email is already under review';
  }
  return null;
};

const counts = async (statuses) => {
  const out = {};
  for (const s of statuses) out[s] = await PartnerRequest.countDocuments({ status: s });
  return out;
};

// ---------- Public ----------
// POST /partner-requests
exports.apply = async (req, res, next) => {
  try {
    if (req.body.website) return res.status(201).json({ success: true, message: 'Application received' }); // honeypot (bots)
    const { data, error } = clean(req.body);
    if (error) return next(new ErrorHandler(error, 400));

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if ((await PartnerRequest.countDocuments({ source: 'applicant', createdAt: { $gte: hourAgo } })) > 100) {
      return next(new ErrorHandler('Too many applications right now. Please try again later.', 429));
    }
    const dup = await duplicateError(data.email);
    if (dup) return next(new ErrorHandler(dup, 400));

    const reqDoc = await PartnerRequest.create({ ...data, source: 'applicant', status: 'Applied' });
    await tryMail({
      email: data.email,
      subject: 'We received your delivery partner application',
      html: wrap('Application received', `<p>Hi ${esc(data.name)},</p><p>Thanks for applying to join as a delivery partner. Our manager will review your details and the admin will confirm. You will get an email once a decision is made.</p>`),
    });
    res.status(201).json({ success: true, message: 'Application received', id: reqDoc._id });
  } catch (e) {
    next(e);
  }
};

// ---------- Manager ----------
const MANAGER_STATUSES = ['Applied', 'Forwarded', 'Approved', 'Rejected'];

// GET /partner-requests/manager
exports.managerList = async (req, res, next) => {
  try {
    const requests = await PartnerRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, requests, counts: await counts(MANAGER_STATUSES) });
  } catch (e) { next(e); }
};

// GET /partner-requests/manager/count  (sidebar badge)
exports.managerCount = async (req, res, next) => {
  try {
    res.json({ success: true, pending: await PartnerRequest.countDocuments({ status: 'Applied' }) });
  } catch (e) { next(e); }
};

// POST /partner-requests/manager/add : manager khud partner jodta hai, admin ke yes/no ke liye jata hai
exports.managerAdd = async (req, res, next) => {
  try {
    const { data, error } = clean(req.body);
    if (error) return next(new ErrorHandler(error, 400));
    const dup = await duplicateError(data.email);
    if (dup) return next(new ErrorHandler(dup, 400));
    const doc = await PartnerRequest.create({
      ...data, source: 'manager', status: 'Forwarded',
      managerNote: String(req.body.managerNote || '').trim().slice(0, 500),
      reviewedBy: req.user._id, reviewedAt: new Date(),
    });
    res.status(201).json({ success: true, request: doc, message: 'Sent to admin for approval' });
  } catch (e) { next(e); }
};

const loadApplied = async (id, next) => {
  const doc = await PartnerRequest.findById(id);
  if (!doc) { next(new ErrorHandler('Request not found', 404)); return null; }
  if (doc.status !== 'Applied') { next(new ErrorHandler(`This request is already ${doc.status.toLowerCase()}`, 400)); return null; }
  return doc;
};

// PUT /partner-requests/manager/:id/forward  { note }
exports.managerForward = async (req, res, next) => {
  try {
    const doc = await loadApplied(req.params.id, next);
    if (!doc) return;
    doc.status = 'Forwarded';
    doc.managerNote = String(req.body.note || '').trim().slice(0, 500);
    doc.reviewedBy = req.user._id;
    doc.reviewedAt = new Date();
    await doc.save();
    res.json({ success: true, request: doc, message: 'Forwarded to admin' });
  } catch (e) { next(e); }
};

// PUT /partner-requests/manager/:id/reject  { note }
exports.managerReject = async (req, res, next) => {
  try {
    const doc = await loadApplied(req.params.id, next);
    if (!doc) return;
    doc.status = 'Rejected';
    doc.rejectedBy = 'manager';
    doc.managerNote = String(req.body.note || '').trim().slice(0, 500);
    doc.reviewedBy = req.user._id;
    doc.reviewedAt = new Date();
    await doc.save();
    await tryMail({
      email: doc.email,
      subject: 'Your delivery partner application',
      html: wrap('Application update', `<p>Hi ${esc(doc.name)},</p><p>Thank you for your interest. Unfortunately we are not able to take your application forward right now.</p>`),
    });
    res.json({ success: true, request: doc, message: 'Application rejected' });
  } catch (e) { next(e); }
};

// ---------- Admin (sirf yes / no) ----------
// GET /partner-requests/admin : jo manager ne forward kiya + unka faisla. "Applied" admin ko nahi dikhta.
exports.adminList = async (req, res, next) => {
  try {
    const all = await PartnerRequest.find({ status: { $in: ['Forwarded', 'Approved', 'Rejected'] } }).sort({ createdAt: -1 });
    // Manager ne reject kiye hue admin ke history me nahi aate
    const requests = all.filter((r) => !(r.status === 'Rejected' && r.rejectedBy === 'manager'));
    res.json({ success: true, requests, counts: await counts(['Forwarded']) });
  } catch (e) { next(e); }
};

exports.adminCount = async (req, res, next) => {
  try {
    res.json({ success: true, pending: await PartnerRequest.countDocuments({ status: 'Forwarded' }) });
  } catch (e) { next(e); }
};

const loadForwarded = async (id, next) => {
  const doc = await PartnerRequest.findById(id);
  if (!doc) { next(new ErrorHandler('Request not found', 404)); return null; }
  if (doc.status !== 'Forwarded') { next(new ErrorHandler(`This request is already ${doc.status.toLowerCase()}`, 400)); return null; }
  return doc;
};

// PUT /partner-requests/admin/:id/approve
exports.adminApprove = async (req, res, next) => {
  try {
    const doc = await loadForwarded(req.params.id, next);
    if (!doc) return;
    if (await DeliveryPartner.findOne({ email: doc.email })) {
      return next(new ErrorHandler('A delivery partner with this email already exists', 400));
    }
    const password = genPassword();
    const partner = await DeliveryPartner.create({
      name: doc.name, email: doc.email, phone: doc.phone, password,
      vehicleType: doc.vehicleType, vehicleNumber: doc.vehicleNumber, city: doc.city,
    });
    doc.status = 'Approved';
    doc.partner = partner._id;
    doc.adminNote = String(req.body.note || '').trim().slice(0, 500);
    doc.decidedBy = req.user._id;
    doc.decidedAt = new Date();
    await doc.save();

    const loginUrl = `${(process.env.CLIENT_URL || process.env.FRONTEND_URL || '').split(',')[0].trim().replace(/\/$/, '')}/delivery/login`;
    const emailed = await tryMail({
      email: doc.email,
      subject: 'Welcome! Your delivery partner account is ready',
      html: wrap('You are approved!', `<p>Hi ${esc(doc.name)},</p><p>Your application has been approved. Login details:</p>
        <p><b>Email:</b> ${esc(doc.email)}<br/><b>Password:</b> ${esc(password)}</p>
        ${loginUrl.startsWith('http') ? `<p>Login here: <a href="${esc(loginUrl)}">${esc(loginUrl)}</a></p>` : ''}
        <p>Please change your password after your first login.</p>`),
    });
    res.json({ success: true, request: doc, partner: { _id: partner._id, name: partner.name, email: partner.email }, password, emailed, message: 'Approved. Partner account created.' });
  } catch (e) { next(e); }
};

// PUT /partner-requests/admin/:id/reject
exports.adminReject = async (req, res, next) => {
  try {
    const doc = await loadForwarded(req.params.id, next);
    if (!doc) return;
    doc.status = 'Rejected';
    doc.rejectedBy = 'admin';
    doc.adminNote = String(req.body.note || '').trim().slice(0, 500);
    doc.decidedBy = req.user._id;
    doc.decidedAt = new Date();
    await doc.save();
    await tryMail({
      email: doc.email,
      subject: 'Your delivery partner application',
      html: wrap('Application update', `<p>Hi ${esc(doc.name)},</p><p>Thank you for your interest. We are not able to approve your application at this time.</p>`),
    });
    res.json({ success: true, request: doc, message: 'Rejected' });
  } catch (e) { next(e); }
};
