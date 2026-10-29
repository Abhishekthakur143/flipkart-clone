const crypto = require('crypto');
const validator = require('validator');
const User = require('../models/User');
const SellerProfile = require('../models/SellerProfile');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Deal = require('../models/Deal');
const SellerRequest = require('../models/SellerRequest');
const { markGranted } = require('./sellerRequestController');
const Order = require('../models/Order');
const cloudinary = require('../config/cloudinary');
const ErrorHandler = require('../utils/errorHandler');
const sendEmail = require('../utils/sendEmail');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tryMail = async (o) => { try { await sendEmail(o); return true; } catch (e) { console.error('Seller mail failed:', e.message); return false; } };
const wrap = (t, b) => `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto"><h2 style="color:#2874f0">${t}</h2>${b}</div>`;
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
const clientUrl = () => (process.env.CLIENT_URL || process.env.FRONTEND_URL || '').split(',')[0].trim().replace(/\/$/, '');
const INVITE_DAYS = 7;
const ID_TYPES = ['Aadhaar', 'PAN', 'Voter ID', 'Driving Licence', 'Passport'];

const publicProfile = (p) => {
  const o = typeof p.toObject === 'function' ? p.toObject() : { ...p };
  delete o.inviteTokenHash; delete o.inviteExpire;
  return o;
};

// Pehli sale (Delivered) ke baad seller "trusted" ban jata hai
const syncTrusted = async (profile, soldUnits) => {
  if (!profile.trusted && soldUnits > 0) {
    profile.trusted = true;
    profile.trustedAt = new Date();
    await profile.save();
  }
  return profile.trusted;
};

const makeInvite = () => {
  const token = crypto.randomBytes(24).toString('hex');
  return { token, hash: hash(token), expire: new Date(Date.now() + INVITE_DAYS * 86400 * 1000) };
};
const inviteLink = (token) => `${clientUrl()}/seller/setup/${token}`;
const inviteMail = async (user, token) =>
  tryMail({
    email: user.email,
    subject: 'Your seller access is ready: set your password',
    html: wrap('Welcome aboard!', `<p>Hi ${esc(user.name)},</p><p>Our manager has given you seller access. Click below to set your password. The link works for ${INVITE_DAYS} days.</p>
      <p><a href="${esc(inviteLink(token))}" style="background:#2874f0;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block">Set my password</a></p>
      <p style="color:#667085;font-size:13px">If the button does not work, copy this link: ${esc(inviteLink(token))}</p>`),
  });

// ---------- Manager: sellers ----------
// POST /seller/manager/invite  { name, email, phone?, shopName? }  = "Grant access"
exports.invite = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').toLowerCase().trim();
    const phone = String(req.body.phone || '').trim();
    if (!name) return next(new ErrorHandler('Please enter the seller name', 400));
    if (!validator.isEmail(email)) return next(new ErrorHandler('Please enter a valid email', 400));
    if (await User.findOne({ email })) return next(new ErrorHandler('An account with this email already exists', 400));

    const inv = makeInvite();
    const user = await User.create({
      name, email, phone, role: 'seller', isVerified: false, createdBy: req.user._id,
      password: crypto.randomBytes(16).toString('hex'), // seller link se apna password rakhega
    });
    const profile = await SellerProfile.create({
      user: user._id, invitedBy: req.user._id, status: 'Invited',
      shopName: String(req.body.shopName || '').trim().slice(0, 120),
      inviteTokenHash: inv.hash, inviteExpire: inv.expire,
    });
    const emailed = await inviteMail(user, inv.token);
    if (req.body.requestId) await markGranted(req.body.requestId, req.user._id);
    res.status(201).json({ success: true, seller: { user: { _id: user._id, name, email, phone, isActive: true }, profile: publicProfile(profile) }, setupLink: inviteLink(inv.token), emailed });
  } catch (e) { next(e); }
};

// GET /seller/manager/list
exports.list = async (req, res, next) => {
  try {
    const profiles = await SellerProfile.find().sort({ createdAt: -1 });
    const users = await User.find({ role: 'seller' });
    const uMap = Object.fromEntries(users.map((u) => [String(u._id), u]));
    const deals = await Deal.find().select('seller status');
    const sellers = profiles.map((p) => {
      const u = uMap[String(p.user)];
      if (!u) return null;
      const mine = deals.filter((d) => String(d.seller) === String(u._id));
      return {
        user: { _id: u._id, name: u.name, email: u.email, phone: u.phone, isActive: u.isActive !== false, passwordSet: !!u.isVerified },
        profile: publicProfile(p),
        dealCount: mine.length,
        approvedDeals: mine.filter((d) => d.status === 'Approved').length,
      };
    }).filter(Boolean);
    res.json({ success: true, sellers, counts: { Pending: profiles.filter((p) => p.status === 'Pending').length } });
  } catch (e) { next(e); }
};

exports.count = async (req, res, next) => {
  try { const pending = await SellerProfile.countDocuments({ status: 'Pending' }); const requests = await SellerRequest.countDocuments({ status: 'New' }); res.json({ success: true, pending: pending + requests, verifications: pending, requests }); } catch (e) { next(e); }
};

const loadSeller = async (id, next) => {
  const profile = await SellerProfile.findById(id);
  const user = profile && (await User.findById(profile.user));
  if (!profile || !user || user.role !== 'seller') { next(new ErrorHandler('Seller not found', 404)); return {}; }
  return { profile, user };
};

// PUT /seller/manager/:id/resend : naya link (purana band)
exports.resend = async (req, res, next) => {
  try {
    const { profile, user } = await loadSeller(req.params.id, next);
    if (!profile) return;
    if (user.isVerified) return next(new ErrorHandler('This seller has already set a password', 400));
    const inv = makeInvite();
    profile.inviteTokenHash = inv.hash; profile.inviteExpire = inv.expire;
    await profile.save();
    const emailed = await inviteMail(user, inv.token);
    res.json({ success: true, setupLink: inviteLink(inv.token), emailed });
  } catch (e) { next(e); }
};

// PUT /seller/manager/:id/verify
exports.verify = async (req, res, next) => {
  try {
    const { profile, user } = await loadSeller(req.params.id, next);
    if (!profile) return;
    if (profile.status !== 'Pending') return next(new ErrorHandler(`Only submitted forms can be verified (this one is ${profile.status.toLowerCase()})`, 400));
    profile.status = 'Verified'; profile.reviewedBy = req.user._id; profile.reviewedAt = new Date(); profile.rejectReason = '';
    await profile.save();
    await tryMail({ email: user.email, subject: 'You are verified as a seller', html: wrap('Verification complete', `<p>Hi ${esc(user.name)},</p><p>Your shop details are verified. You can now log in and send your first item to the manager.</p>`) });
    res.json({ success: true, profile: publicProfile(profile), message: 'Seller verified' });
  } catch (e) { next(e); }
};

// PUT /seller/manager/:id/reject  { reason }
exports.reject = async (req, res, next) => {
  try {
    const { profile, user } = await loadSeller(req.params.id, next);
    if (!profile) return;
    if (profile.status !== 'Pending') return next(new ErrorHandler(`Only submitted forms can be rejected (this one is ${profile.status.toLowerCase()})`, 400));
    const reason = String(req.body.reason || '').trim().slice(0, 500);
    if (!reason) return next(new ErrorHandler('Please write a reason so the seller can fix the form', 400));
    profile.status = 'Rejected'; profile.reviewedBy = req.user._id; profile.reviewedAt = new Date(); profile.rejectReason = reason;
    await profile.save();
    await tryMail({ email: user.email, subject: 'Please update your seller details', html: wrap('Verification needs changes', `<p>Hi ${esc(user.name)},</p><p>We could not verify your details yet. Reason: <b>${esc(reason)}</b></p><p>Please log in, fix the form and submit it again.</p>`) });
    res.json({ success: true, profile: publicProfile(profile), message: 'Sent back to seller' });
  } catch (e) { next(e); }
};

// PUT /seller/manager/:id/active { isActive }
exports.setActive = async (req, res, next) => {
  try {
    const { user } = await loadSeller(req.params.id, next);
    if (!user) return;
    user.isActive = req.body.isActive !== false;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, isActive: user.isActive });
  } catch (e) { next(e); }
};

// ---------- Public: set password via emailed link ----------
const byToken = async (token) => {
  const p = await SellerProfile.findOne({ inviteTokenHash: hash(String(token)) }).select('+inviteTokenHash +inviteExpire');
  if (!p || !p.inviteExpire || new Date(p.inviteExpire) < new Date()) return {};
  const user = await User.findById(p.user);
  return user && user.role === 'seller' ? { profile: p, user } : {};
};

exports.setupInfo = async (req, res, next) => {
  try {
    const { user } = await byToken(req.params.token);
    if (!user) return next(new ErrorHandler('This link is invalid or has expired. Ask the manager for a new one.', 400));
    res.json({ success: true, name: user.name, email: user.email });
  } catch (e) { next(e); }
};

exports.setupPassword = async (req, res, next) => {
  try {
    const { profile, user } = await byToken(req.params.token);
    if (!user) return next(new ErrorHandler('This link is invalid or has expired. Ask the manager for a new one.', 400));
    const password = String(req.body.password || '');
    if (password.length < 6) return next(new ErrorHandler('Password should be minimum 6 characters', 400));
    user.password = password; user.isVerified = true;
    await user.save();
    profile.inviteTokenHash = undefined; profile.inviteExpire = undefined; // link ek hi baar
    await profile.save();
    res.json({ success: true, message: 'Password set. You can log in now.' });
  } catch (e) { next(e); }
};

// ---------- Seller ----------
const loadMine = async (req, next) => {
  const profile = await SellerProfile.findOne({ user: req.user._id });
  if (!profile) { next(new ErrorHandler('Seller profile not found', 404)); return null; }
  return profile;
};

exports.me = async (req, res, next) => {
  try {
    const profile = await loadMine(req, next);
    if (!profile) return;
    res.json({ success: true, profile: publicProfile(profile), user: { name: req.user.name, email: req.user.email } });
  } catch (e) { next(e); }
};

exports.categories = async (req, res, next) => {
  try {
    const cats = await Category.find().select('name');
    res.json({ success: true, categories: cats.map((c) => ({ _id: c._id, name: c.name })) });
  } catch (e) { next(e); }
};

const uploadImage = async (img, folder) => {
  if (typeof img !== 'string' || !/^data:image\/(png|jpe?g|webp);base64,/.test(img)) throw new ErrorHandler('Only PNG, JPG or WEBP images are allowed', 400);
  if (img.length > 2_500_000) throw new ErrorHandler('Image is too large. Please use a smaller photo.', 400);
  const r = await cloudinary.uploader.upload(img, { folder, width: 800, crop: 'scale' });
  return { public_id: r.public_id, url: r.secure_url };
};
exports._uploadImage = uploadImage;

// PUT /seller/profile : verification form (pehli baar ya reject hone ke baad dobara)
exports.submitProfile = async (req, res, next) => {
  try {
    const profile = await loadMine(req, next);
    if (!profile) return;
    if (!['Invited', 'Rejected'].includes(profile.status)) {
      return next(new ErrorHandler(profile.status === 'Verified' ? 'You are already verified' : 'Your form is already with the manager for review', 400));
    }
    const b = req.body;
    const d = {
      shopName: String(b.shopName || '').trim(), shopType: String(b.shopType || '').trim(), ownerName: String(b.ownerName || '').trim(),
      phone: String(b.phone || '').trim(), shopAddress: String(b.shopAddress || '').trim(), city: String(b.city || '').trim(),
      state: String(b.state || '').trim(), pincode: String(b.pincode || '').trim(), gstNumber: String(b.gstNumber || '').trim().toUpperCase(),
      idType: String(b.idType || ''), idNumber: String(b.idNumber || '').trim(), yearsInBusiness: Number(b.yearsInBusiness) || 0,
      website: String(b.website || '').trim(), sells: String(b.sells || '').trim(), payoutDetails: String(b.payoutDetails || '').trim(),
    };
    const need = [['shopName', 'shop name'], ['shopType', 'shop type'], ['ownerName', 'owner name'], ['shopAddress', 'shop address'], ['city', 'city'], ['state', 'state'], ['idNumber', 'ID number'], ['payoutDetails', 'UPI / bank details for payments']];
    for (const [k, label] of need) if (!d[k]) return next(new ErrorHandler(`Please enter ${label}`, 400));
    if (!/^[6-9]\d{9}$/.test(d.phone)) return next(new ErrorHandler('Enter a valid 10-digit mobile number', 400));
    if (!/^\d{6}$/.test(d.pincode)) return next(new ErrorHandler('Enter a valid 6-digit pincode', 400));
    if (!ID_TYPES.includes(d.idType)) return next(new ErrorHandler('Please choose an ID type', 400));
    if (d.gstNumber && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(d.gstNumber)) return next(new ErrorHandler('GST number looks wrong (15 characters, e.g. 23ABCDE1234F1Z5)', 400));
    if (d.yearsInBusiness < 0 || d.yearsInBusiness > 100) return next(new ErrorHandler('Enter valid years in business', 400));

    if (b.shopPhoto) d.shopPhoto = await uploadImage(b.shopPhoto, 'sellers');
    else if (!profile.shopPhoto?.url) return next(new ErrorHandler('Please add a photo of your shop', 400));

    Object.assign(profile, d, { status: 'Pending', submittedAt: new Date(), rejectReason: '' });
    await profile.save();
    res.json({ success: true, profile: publicProfile(profile), message: 'Sent to the manager for verification' });
  } catch (e) { next(e); }
};

// GET /seller/dashboard : consignment hisaab. Paisa tab gina jata hai jab order Delivered ho.
exports.dashboard = async (req, res, next) => {
  try {
    const profile = await loadMine(req, next);
    if (!profile) return;
    const products = await Product.find({ seller: req.user._id }).select('+seller +dealPrice +deal name stock images price totalSold');
    const deals = await Deal.find({ seller: req.user._id });
    const costByProduct = {}; const qtyByProduct = {};
    deals.forEach((d) => { if (d.product) { costByProduct[String(d.product)] = d.costPrice; qtyByProduct[String(d.product)] = d.quantity; } });

    const ids = products.map((p) => p._id);
    const orders = ids.length ? await Order.find({ 'items.product': { $in: ids } }).select('items orderStatus delivery.status') : [];
    const rows = Object.fromEntries(products.map((p) => [String(p._id), {
      _id: p._id, name: p.name, image: p.images?.[0]?.url || '', listed: qtyByProduct[String(p._id)] || 0, stock: Math.max(p.stock || 0, 0),
      dealPrice: p.dealPrice || 0, costPrice: costByProduct[String(p._id)] ?? null, soldUnits: 0, pendingUnits: 0,
    }]));
    orders.forEach((o) => {
      if (['Cancelled', 'Returned'].includes(o.orderStatus)) return;
      const delivered = o.orderStatus === 'Delivered' || o.delivery?.status === 'Delivered';
      (o.items || []).forEach((it) => {
        const r = rows[String(it.product)];
        if (!r) return;
        if (delivered) r.soldUnits += it.quantity; else r.pendingUnits += it.quantity;
      });
    });
    const list = Object.values(rows).map((r) => ({
      ...r,
      earned: r.soldUnits * r.dealPrice,
      pendingEarnings: r.pendingUnits * r.dealPrice,
      profit: r.costPrice == null ? null : r.soldUnits * (r.dealPrice - r.costPrice),
    }));
    const sum = (k) => list.reduce((a, r) => a + (r[k] || 0), 0);
    const soldUnits = sum('soldUnits');
    const trusted = await syncTrusted(profile, soldUnits);
    const by = (s) => deals.filter((d) => d.status === s).length;
    res.json({
      success: true, trusted, status: profile.status,
      stats: { productsListed: list.length, unitsListed: sum('listed'), stockLeft: sum('stock'), soldUnits, pendingUnits: sum('pendingUnits'), revenue: sum('earned'), pendingRevenue: sum('pendingEarnings'), profit: list.reduce((a, r) => a + (r.profit || 0), 0) },
      products: list,
      deals: { open: by('Proposed') + by('Countered') + by('Agreed'), waitingSeller: by('Countered'), withAdmin: by('PendingAdmin'), approved: by('Approved'), closed: by('Closed') + by('Rejected') },
    });
  } catch (e) { next(e); }
};
