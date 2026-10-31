const crypto = require('crypto');
const mongoose = require('mongoose');
const Reward = require('../models/Reward');
const RewardRule = require('../models/RewardRule');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const DeliveryPartner = require('../models/DeliveryPartner');
const ErrorHandler = require('../utils/errorHandler');
const { computeStats, rangeFor, PERIODS } = require('../utils/analyticsCore');

// Kis recipient ke liye kaun si metric ho sakti hai (analyticsCore ke field names)
const METRICS = {
  user: ['spent', 'orders'],
  delivery: ['deliveries', 'orderValue', 'companyMargin'],
  manager: ['productsAdded', 'unitsSold', 'margin', 'dealsHandled'],
  seller: ['productsAdded', 'unitsSold', 'companyMargin', 'sellerProfit'],
  admin: [], // admin ko sirf superadmin manual gift deta hai, iske target rules nahi hote
};
const TYPES = Object.keys(METRICS);
const GIFTS = ['bonus', 'coupon', 'points', 'badge', 'commission', 'other'];
const LIST_KEY = { user: 'users', delivery: 'partners', manager: 'managers', seller: 'sellers' };
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Customer ke liye real coupon (flat discount, 1 baar use)
const makeCoupon = async (amount, label) => {
  const code = `GIFT${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const now = new Date();
  await Coupon.create({
    code, discountType: 'flat', discountValue: amount, minimumOrderValue: 0,
    usageLimit: 1, perUserLimit: 1, validFrom: now, validTo: new Date(now.getTime() + 30 * 864e5),
    description: label || 'Gift coupon',
  });
  return code;
};

const findRecipient = async (type, id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  if (type === 'delivery') {
    const p = await DeliveryPartner.findById(id).select('name');
    return p && { name: p.name };
  }
  const u = await User.findOne({ _id: id, role: type }).select('name');
  return u && { name: u.name };
};

// ---------- Recipients search (manual gift ke liye) ----------
exports.recipients = async (req, res, next) => {
  try {
    const type = req.query.type;
    if (!TYPES.includes(type)) return next(new ErrorHandler('Invalid type', 400));
    if (type === 'admin' && req.user.role !== 'superadmin') return next(new ErrorHandler('Only super admin can gift admins', 403));
    const q = String(req.query.q || '').trim().slice(0, 50);
    const f = q ? { $or: [{ name: new RegExp(esc(q), 'i') }, { email: new RegExp(esc(q), 'i') }] } : {};
    const docs = type === 'delivery'
      ? await DeliveryPartner.find(f).select('name email city').limit(15).lean()
      : await User.find({ ...f, role: type }).select('name email').limit(15).lean();
    res.json({ success: true, list: docs.map((d) => ({ id: d._id, name: d.name, sub: d.email || d.city || '' })) });
  } catch (e) { next(e); }
};

// ---------- Gifts ----------
exports.list = async (req, res, next) => {
  try {
    const f = {};
    if (['Pending', 'Given', 'Rejected'].includes(req.query.status)) f.status = req.query.status;
    const isSuper = req.user.role === 'superadmin';
    if (TYPES.includes(req.query.recipientType)) {
      if (req.query.recipientType === 'admin' && !isSuper) return res.json({ success: true, rewards: [], pending: 0 });
      f.recipientType = req.query.recipientType;
    } else if (!isSuper) f.recipientType = { $ne: 'admin' };
    const rewards = await Reward.find(f).sort({ createdAt: -1 }).limit(300).lean();
    const pending = await Reward.countDocuments({ status: 'Pending' });
    res.json({ success: true, rewards, pending });
  } catch (e) { next(e); }
};

// POST /admin/rewards : admin manually gift deta hai
exports.give = async (req, res, next) => {
  try {
    const b = req.body;
    const type = b.recipientType;
    if (!TYPES.includes(type)) return next(new ErrorHandler('Choose who gets the gift', 400));
    if (type === 'admin' && req.user.role !== 'superadmin') return next(new ErrorHandler('Only super admin can gift admins', 403));
    const title = String(b.title || '').trim().slice(0, 120);
    if (!title) return next(new ErrorHandler('Please write what the gift is', 400));
    const giftType = GIFTS.includes(b.giftType) ? b.giftType : 'bonus';
    const amount = Math.max(0, Number(b.amount) || 0);
    if (giftType === 'coupon' && (type !== 'user' || amount <= 0)) {
      return next(new ErrorHandler('Coupons are only for customers and need an amount', 400));
    }
    const who = await findRecipient(type, b.recipientId);
    if (!who) return next(new ErrorHandler('Recipient not found', 404));

    const reward = await Reward.create({
      recipientType: type, recipientId: b.recipientId, recipientName: who.name, title, giftType, amount,
      note: String(b.note || '').trim().slice(0, 300), source: 'manual', status: 'Given',
      givenBy: req.user._id, givenAt: new Date(),
    });
    if (giftType === 'coupon') {
      reward.couponCode = await makeCoupon(amount, title);
      await reward.save();
    }
    res.status(201).json({ success: true, reward, message: `Gift given to ${who.name}` });
  } catch (e) { next(e); }
};

exports.approve = async (req, res, next) => {
  try {
    const reward = await Reward.findById(req.params.id);
    if (!reward) return next(new ErrorHandler('Reward not found', 404));
    if (reward.status !== 'Pending') return next(new ErrorHandler(`This gift is already ${reward.status.toLowerCase()}`, 400));
    if (reward.giftType === 'coupon' && !reward.couponCode) reward.couponCode = await makeCoupon(reward.amount, reward.title);
    reward.status = 'Given'; reward.givenBy = req.user._id; reward.givenAt = new Date();
    await reward.save();
    res.json({ success: true, reward, message: 'Gift approved' });
  } catch (e) { next(e); }
};

exports.reject = async (req, res, next) => {
  try {
    const reward = await Reward.findById(req.params.id);
    if (!reward) return next(new ErrorHandler('Reward not found', 404));
    if (reward.status !== 'Pending') return next(new ErrorHandler(`This gift is already ${reward.status.toLowerCase()}`, 400));
    reward.status = 'Rejected'; reward.givenBy = req.user._id;
    await reward.save();
    res.json({ success: true, reward, message: 'Gift rejected' });
  } catch (e) { next(e); }
};

// ---------- Rules ----------
const cleanRule = (b) => {
  const type = b.recipientType;
  if (!TYPES.includes(type)) return { err: 'Choose who this rule is for' };
  if (!METRICS[type].includes(b.metric)) return { err: 'This target does not match the chosen recipient' };
  if (!PERIODS.includes(b.period)) return { err: 'Choose a period' };
  const target = Number(b.target);
  if (!(target > 0)) return { err: 'Target must be more than 0' };
  const giftType = GIFTS.includes(b.giftType) ? b.giftType : 'bonus';
  const amount = Math.max(0, Number(b.amount) || 0);
  if (giftType === 'coupon' && (type !== 'user' || amount <= 0)) return { err: 'Coupons are only for customers and need an amount' };
  const giftTitle = String(b.giftTitle || '').trim().slice(0, 120);
  if (!giftTitle) return { err: 'Please write what the gift is' };
  return {
    data: {
      name: String(b.name || giftTitle).trim().slice(0, 120), recipientType: type, metric: b.metric, period: b.period,
      target, giftType, giftTitle, amount, autoGrant: b.autoGrant === true || b.autoGrant === 'true', isActive: b.isActive !== false,
    },
  };
};

exports.listRules = async (req, res, next) => {
  try { res.json({ success: true, rules: await RewardRule.find().sort({ createdAt: -1 }).lean() }); } catch (e) { next(e); }
};

exports.createRule = async (req, res, next) => {
  try {
    const { data, err } = cleanRule(req.body);
    if (err) return next(new ErrorHandler(err, 400));
    res.status(201).json({ success: true, rule: await RewardRule.create(data), message: 'Rule saved' });
  } catch (e) { next(e); }
};

exports.updateRule = async (req, res, next) => {
  try {
    const rule = await RewardRule.findById(req.params.id);
    if (!rule) return next(new ErrorHandler('Rule not found', 404));
    const { data, err } = cleanRule({ ...rule.toObject(), ...req.body });
    if (err) return next(new ErrorHandler(err, 400));
    Object.assign(rule, data);
    await rule.save();
    res.json({ success: true, rule, message: 'Rule updated' });
  } catch (e) { next(e); }
};

exports.deleteRule = async (req, res, next) => {
  try {
    const rule = await RewardRule.findById(req.params.id);
    if (!rule) return next(new ErrorHandler('Rule not found', 404));
    await rule.deleteOne();
    res.json({ success: true, message: 'Rule deleted' });
  } catch (e) { next(e); }
};

// ---------- Auto rewards ----------
// Har active rule ke liye current period ka hisaab dekho; target pura to gift (ek period me ek hi baar)
async function runRules() {
  const rules = await RewardRule.find({ isActive: true });
  const cache = {};
  const out = { created: 0, given: 0, pending: 0 };

  for (const rule of rules) {
    const r = rangeFor(rule.period);
    cache[r.key] = cache[r.key] || (await computeStats(r.from, r.to, rule.period));
    const list = cache[r.key][LIST_KEY[rule.recipientType]] || [];

    for (const e of list) {
      const val = e[rule.metric] || 0;
      if (val < rule.target) continue;
      try {
        const reward = await Reward.create({
          recipientType: rule.recipientType, recipientId: e.id, recipientName: e.name,
          title: rule.giftTitle, giftType: rule.giftType, amount: rule.amount, source: 'auto',
          rule: rule._id, periodKey: r.key, achieved: val,
          note: `${rule.metric} reached ${Math.round(val)} (target ${rule.target}, ${rule.period})`,
          status: rule.autoGrant ? 'Given' : 'Pending', givenAt: rule.autoGrant ? new Date() : undefined,
        });
        out.created += 1;
        if (rule.autoGrant) {
          out.given += 1;
          if (rule.giftType === 'coupon') {
            reward.couponCode = await makeCoupon(rule.amount, rule.giftTitle);
            await reward.save();
          }
        } else out.pending += 1;
      } catch (err) {
        if (err.code === 11000) continue; // is period ka gift pehle mil chuka
        throw err;
      }
    }
  }
  return out;
}

let lastRun = 0;
// Delivery/order hook ke liye: 2 minute me max ek baar chalega
exports.runRulesThrottled = async () => {
  if (Date.now() - lastRun < 120000) return null;
  lastRun = Date.now();
  return runRules();
};
exports.runRules = runRules;

exports.run = async (req, res, next) => {
  try {
    const out = await runRules();
    res.json({
      success: true, ...out,
      message: out.created ? `${out.created} new gift(s): ${out.given} given, ${out.pending} waiting for approval` : 'No new targets reached right now',
    });
  } catch (e) { next(e); }
};

// ---------- Apne gifts (manager / seller / delivery / customer apne panel me dekhte hain) ----------
// GET .../rewards : delivery partner ke liye req.partner, baaki ke liye req.user
exports.mine = async (req, res, next) => {
  try {
    const type = req.partner ? 'delivery' : req.user && req.user.role;
    const id = req.partner ? req.partner._id : req.user && req.user._id;
    if (!TYPES.includes(type) || !id) {
      return res.json({ success: true, rewards: [], targets: [], totals: { count: 0, cash: 0 } });
    }

    const rewards = await Reward.find({ recipientType: type, recipientId: id, status: { $in: ['Given', 'Pending'] } })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('title giftType amount couponCode note source status createdAt givenAt')
      .lean();

    // Active targets aur abhi tak kitna kaam hua
    const rules = await RewardRule.find({ isActive: true, recipientType: type }).lean();
    const cache = {};
    const targets = [];
    for (const rule of rules) {
      const r = rangeFor(rule.period);
      cache[r.key] = cache[r.key] || (await computeStats(r.from, r.to, rule.period));
      const e = (cache[r.key][LIST_KEY[type]] || []).find((x) => String(x.id) === String(id));
      const current = Math.round((e ? e[rule.metric] : 0) || 0);
      targets.push({
        _id: rule._id, name: rule.name, metric: rule.metric, period: rule.period, target: rule.target, current,
        giftType: rule.giftType, giftTitle: rule.giftTitle, amount: rule.amount, achieved: current >= rule.target,
      });
    }

    const given = rewards.filter((x) => x.status === 'Given');
    res.json({
      success: true,
      rewards,
      targets,
      totals: { count: given.length, cash: given.filter((x) => x.giftType === 'bonus').reduce((a, x) => a + (x.amount || 0), 0) },
    });
  } catch (e) { next(e); }
};
