const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const User = require('../models/User');
const SellerProfile = require('../models/SellerProfile');
const ActivityLog = require('../models/ActivityLog');
const PartnerRequest = require('../models/PartnerRequest');
const Deal = require('../models/Deal');
const SellerRequest = require('../models/SellerRequest');
const DeliveryPartner = require('../models/DeliveryPartner');
const sellerController = require('./sellerController');
const ErrorHandler = require('../utils/errorHandler');

const isId = (id) => /^[a-f\d]{24}$/i.test(String(id));
const genPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(12), (b) => chars[b % chars.length]).join('');
};
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ROLES = ['superadmin', 'admin', 'manager', 'seller', 'user'];
const CREATABLE = ['superadmin', 'admin', 'manager']; // seller manager se, user khud register karta hai
const SWITCHABLE = ['superadmin', 'admin', 'manager', 'user']; // seller ka role yahan se nahi badalta
const view = (u) => ({
  _id: u._id, name: u.name, email: u.email, phone: u.phone || '', role: u.role,
  isActive: u.isActive !== false, createdAt: u.createdAt,
});

const activeSuperAdmins = async () => (await User.find({ role: 'superadmin' })).filter((u) => u.isActive !== false);
const find = async (id, next) => {
  const u = isId(id) ? await User.findById(id) : null;
  if (!u) { next(new ErrorHandler('Account not found', 404)); return null; }
  return u;
};
const isSelf = (req, u) => String(u._id) === String(req.user._id);
// Kisi ko hatane/disable/role badalne se pehle: akhri active superadmin nahi hona chahiye
const lastSuperAdminGuard = async (u, next) => {
  if (u.role !== 'superadmin') return true;
  const all = await activeSuperAdmins();
  if (all.length <= 1 && all.some((x) => String(x._id) === String(u._id))) {
    next(new ErrorHandler('This is the last active super admin. Create another one first.', 400));
    return false;
  }
  return true;
};

// GET /superadmin/overview
exports.overview = async (req, res, next) => {
  try {
    const counts = {};
    for (const r of ROLES) counts[r] = await User.countDocuments({ role: r });
    const disabled = (await User.find({ role: { $in: ['superadmin', 'admin', 'manager', 'seller'] } })).filter((u) => u.isActive === false).length;
    const waiting = {
      partnerApprovals: await PartnerRequest.countDocuments({ status: 'Forwarded' }),
      dealApprovals: await Deal.countDocuments({ status: 'PendingAdmin' }),
      sellerRequests: await SellerRequest.countDocuments({ status: 'New' }),
      sellerVerifications: await SellerProfile.countDocuments({ status: 'Pending' }),
    };
    const recent = (await ActivityLog.find().sort({ createdAt: -1 })).slice(0, 8);
    res.json({ success: true, counts, disabled, waiting, recent });
  } catch (e) { next(e); }
};

// GET /superadmin/accounts?role=&q=
exports.listAccounts = async (req, res, next) => {
  try {
    const f = {};
    if (ROLES.includes(req.query.role)) f.role = req.query.role;
    const q = String(req.query.q || '').trim().slice(0, 60);
    if (q) { const re = new RegExp(esc(q), 'i'); f.$or = [{ name: re }, { email: re }]; }
    const users = (await User.find(f).sort({ createdAt: -1 })).slice(0, 300);
    const counts = {};
    for (const r of ROLES) counts[r] = await User.countDocuments({ role: r });
    res.json({ success: true, accounts: users.map(view), counts });
  } catch (e) { next(e); }
};

// POST /superadmin/accounts { name, email, phone?, role, password? }
exports.createAccount = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').toLowerCase().trim();
    const phone = String(req.body.phone || '').trim();
    const role = String(req.body.role || '');
    if (!name) return next(new ErrorHandler('Please enter a name', 400));
    if (!validator.isEmail(email)) return next(new ErrorHandler('Please enter a valid email', 400));
    if (!CREATABLE.includes(role)) return next(new ErrorHandler('You can create a super admin, admin or manager here', 400));
    let password = String(req.body.password || '');
    if (!password) password = genPassword();
    if (password.length < 8) return next(new ErrorHandler('Password should be minimum 8 characters', 400));
    if (await User.findOne({ email })) return next(new ErrorHandler('An account with this email already exists', 400));
    const u = await User.create({ name, email, phone, password, role, isVerified: true, createdBy: req.user._id });
    res.status(201).json({ success: true, account: view(u), password });
  } catch (e) { next(e); }
};

// PUT /superadmin/accounts/:id { isActive?, role?, name? }
exports.updateAccount = async (req, res, next) => {
  try {
    const u = await find(req.params.id, next);
    if (!u) return;
    const wantsRole = req.body.role !== undefined && req.body.role !== u.role;
    const wantsOff = req.body.isActive === false && u.isActive !== false;
    if (isSelf(req, u) && (wantsRole || wantsOff)) return next(new ErrorHandler('You cannot change your own role or disable yourself', 400));
    if (wantsRole) {
      if (u.role === 'seller' || req.body.role === 'seller') return next(new ErrorHandler('Seller accounts are managed by the manager', 400));
      if (!SWITCHABLE.includes(req.body.role)) return next(new ErrorHandler('Invalid role', 400));
      if (!(await lastSuperAdminGuard(u, next))) return;
      u.role = req.body.role;
    }
    if (wantsOff && !(await lastSuperAdminGuard(u, next))) return;
    if (req.body.isActive !== undefined) u.isActive = req.body.isActive !== false;
    if (typeof req.body.name === 'string' && req.body.name.trim()) u.name = req.body.name.trim().slice(0, 80);
    await u.save({ validateBeforeSave: false });
    res.json({ success: true, account: view(u), message: 'Account updated' });
  } catch (e) { next(e); }
};

// PUT /superadmin/accounts/:id/password  -> naya random password (ek baar dikhta hai)
exports.resetPassword = async (req, res, next) => {
  try {
    const u = await find(req.params.id, next);
    if (!u) return;
    if (isSelf(req, u)) return next(new ErrorHandler('Use the normal change-password option for your own account', 400));
    const password = genPassword();
    u.password = password;
    await u.save();
    res.json({ success: true, password, account: view(u) });
  } catch (e) { next(e); }
};

// DELETE /superadmin/accounts/:id  (sirf admin / manager / superadmin; seller aur user disable karo)
exports.deleteAccount = async (req, res, next) => {
  try {
    const u = await find(req.params.id, next);
    if (!u) return;
    if (isSelf(req, u)) return next(new ErrorHandler('You cannot delete your own account', 400));
    if (!['admin', 'manager', 'superadmin'].includes(u.role)) return next(new ErrorHandler('Only admin, manager and super admin accounts can be deleted here. Disable sellers and users instead.', 400));
    if (!(await lastSuperAdminGuard(u, next))) return;
    await u.deleteOne();
    res.json({ success: true, message: 'Account deleted' });
  } catch (e) { next(e); }
};

// GET /superadmin/activity?role=&q=&page=
exports.activity = async (req, res, next) => {
  try {
    const f = {};
    if (['superadmin', 'admin', 'manager', 'seller'].includes(req.query.role)) f.role = req.query.role;
    const q = String(req.query.q || '').trim().slice(0, 60);
    if (q) { const re = new RegExp(esc(q), 'i'); f.$or = [{ name: re }, { email: re }, { action: re }]; }
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const per = 50;
    const all = await ActivityLog.find(f).sort({ createdAt: -1 });
    res.json({ success: true, total: all.length, page, pages: Math.max(Math.ceil(all.length / per), 1), logs: all.slice((page - 1) * per, page * per) });
  } catch (e) { next(e); }
};

// GET /superadmin/sellers/:id/dashboard  (:id = SellerProfile id) -> seller ka apna dashboard, read-only
exports.sellerDashboard = async (req, res, next) => {
  try {
    const profile = isId(req.params.id) ? await SellerProfile.findById(req.params.id) : null;
    if (!profile) return next(new ErrorHandler('Seller not found', 404));
    return sellerController.dashboard({ user: { _id: profile.user } }, res, next);
  } catch (e) { next(e); }
};

// GET /superadmin/delivery-partners -> saare delivery partners (Partner app kholne ke liye list)
exports.deliveryPartners = async (req, res, next) => {
  try {
    const partners = await DeliveryPartner.find()
      .select('name email phone vehicleType vehicleNumber city isActive isAvailable')
      .sort({ name: 1 });
    res.json({ success: true, partners });
  } catch (e) { next(e); }
};

// POST /superadmin/delivery-partners/:id/open -> us partner ka (2 ghante ka) delivery token
// Partner ke apne login jaisa hi token (type: 'delivery'), isliye /delivery dashboard poora kaam karta hai.
exports.openPartnerApp = async (req, res, next) => {
  try {
    const partner = isId(req.params.id) ? await DeliveryPartner.findById(req.params.id) : null;
    if (!partner) return next(new ErrorHandler('Delivery partner not found', 404));
    if (partner.isActive === false) return next(new ErrorHandler('This delivery partner is disabled. Enable the partner first.', 400));
    const token = jwt.sign({ id: partner._id, type: 'delivery' }, DeliveryPartner.secret(), { expiresIn: '2h' });
    res.json({ success: true, token, partner: { id: partner._id, name: partner.name, vehicleType: partner.vehicleType } });
  } catch (e) { next(e); }
};
