const Deal = require('../models/Deal');
const SellerProfile = require('../models/SellerProfile');
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const ErrorHandler = require('../utils/errorHandler');
const sendEmail = require('../utils/sendEmail');
const { _uploadImage } = require('./sellerController');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tryMail = async (o) => { try { await sendEmail(o); return true; } catch (e) { console.error('Deal mail failed:', e.message); return false; } };
const wrap = (t, b) => `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto"><h2 style="color:#2874f0">${t}</h2>${b}</div>`;
const isId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v));
const price = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 && n <= 100000000 ? Math.round(n * 100) / 100 : null; };
const note = (v) => String(v || '').trim().slice(0, 500);
const MAX_ROUNDS = 12;      // price offers ek deal me
const MAX_OPEN = 20;        // ek seller ke khule deals
const OPEN = ['Proposed', 'Countered', 'Agreed'];
const lastPrice = (deal, by) => [...deal.events].reverse().find((e) => e.by === by && e.price != null)?.price;
const rounds = (deal) => deal.events.filter((e) => e.price != null).length;

// ---- views ----
// Seller ko store ka margin, selling price aur andar ke notes nahi dikhte
const SELLER_EVENTS = ['proposed', 'countered', 'accepted', 'rejected', 'withdrawn'];
const sellerView = (d) => {
  const o = d.toObject ? d.toObject() : { ...d };
  delete o.sellingPrice; delete o.cuttedPrice; delete o.managerNote; delete o.adminNote;
  o.events = (o.events || []).filter((e) => SELLER_EVENTS.includes(e.type));
  return o;
};
// Manager / admin ko seller ka apna khareed rate (costPrice) nahi dikhta
const staffView = (d, sellers = {}) => {
  const o = d.toObject ? d.toObject() : { ...d };
  delete o.costPrice;
  o.sellerInfo = sellers[String(o.seller)] || null;
  if (o.sellingPrice != null && o.agreedPrice != null) {
    o.marginPerUnit = Math.round((o.sellingPrice - o.agreedPrice) * 100) / 100;
    o.marginTotal = Math.round(o.marginPerUnit * o.quantity * 100) / 100;
  }
  return o;
};

const sellerLookup = async (deals) => {
  const ids = [...new Set(deals.map((d) => String(d.seller)))];
  if (!ids.length) return {};
  const users = await User.find({ _id: { $in: ids } });
  const profiles = await SellerProfile.find({ user: { $in: ids } });
  const prods = await Product.find({ seller: { $in: ids } }).select('+seller totalSold');
  const out = {};
  users.forEach((u) => {
    const p = profiles.find((x) => String(x.user) === String(u._id));
    out[String(u._id)] = {
      _id: u._id, name: u.name, email: u.email, phone: u.phone,
      shopName: p?.shopName || '', city: p?.city || '', trusted: !!p?.trusted,
      unitsSold: prods.filter((x) => String(x.seller) === String(u._id)).reduce((a, x) => a + (x.totalSold || 0), 0),
    };
  });
  return out;
};

const find = async (id, next, statuses, extra = (d) => true) => {
  const deal = isId(id) ? await Deal.findById(id) : null;
  if (!deal || !extra(deal)) { next(new ErrorHandler('Deal not found', 404)); return null; }
  if (statuses && !statuses.includes(deal.status)) {
    next(new ErrorHandler(`This deal is ${deal.status === 'PendingAdmin' ? 'with the admin' : deal.status.toLowerCase()}, so this action is not possible`, 400));
    return null;
  }
  return deal;
};
const push = (deal, by, type, p, n) => deal.events.push({ by, type, price: p, note: n || '' });
const notifySeller = async (deal, subject, body) => {
  const u = await User.findById(deal.seller);
  if (u) await tryMail({ email: u.email, subject, html: wrap(subject, `<p>Hi ${esc(u.name)},</p>${body}`) });
};

// ================= Seller =================
exports.sellerList = async (req, res, next) => {
  try {
    const deals = await Deal.find({ seller: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, deals: deals.map(sellerView) });
  } catch (e) { next(e); }
};
exports.sellerCount = async (req, res, next) => {
  try { res.json({ success: true, waiting: await Deal.countDocuments({ seller: req.user._id, status: 'Countered' }) }); } catch (e) { next(e); }
};

// POST /deals/seller : naya item ka proposal (sirf Verified seller)
exports.create = async (req, res, next) => {
  try {
    const profile = await SellerProfile.findOne({ user: req.user._id });
    if (!profile || profile.status !== 'Verified') return next(new ErrorHandler('Complete your verification first. The manager must verify your shop details.', 403));
    if ((await Deal.countDocuments({ seller: req.user._id, status: { $in: OPEN } })) >= MAX_OPEN) return next(new ErrorHandler('You have too many open deals. Please wait for some to finish.', 400));

    const b = req.body;
    const productName = String(b.productName || '').trim();
    const description = String(b.description || '').trim();
    const quantity = Number(b.quantity);
    const askPrice = price(b.askPrice); const costPrice = Number(b.costPrice);
    if (!productName) return next(new ErrorHandler('Please enter the product name', 400));
    if (description.length < 10) return next(new ErrorHandler('Please describe the product (at least 10 characters)', 400));
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) return next(new ErrorHandler('Quantity should be a whole number, at least 1', 400));
    if (!askPrice) return next(new ErrorHandler('Please enter your price per unit', 400));
    if (!Number.isFinite(costPrice) || costPrice < 0) return next(new ErrorHandler('Please enter your own cost price per unit (only you can see it)', 400));
    if (!isId(b.category) || !(await Category.findById(b.category))) return next(new ErrorHandler('Please choose a valid category', 400));

    let highlights = b.highlights;
    if (typeof highlights === 'string') highlights = highlights.split(',');
    highlights = (Array.isArray(highlights) ? highlights : []).map((h) => String(h).trim().slice(0, 200)).filter(Boolean).slice(0, 10);

    const imgs = Array.isArray(b.images) ? b.images.slice(0, 4) : [];
    const images = [];
    for (const img of imgs) images.push(await _uploadImage(img, 'deals'));

    const deal = await Deal.create({
      seller: req.user._id, productName, category: b.category, brand: String(b.brand || '').trim().slice(0, 80),
      description, highlights, images, quantity, askPrice, costPrice, status: 'Proposed',
      events: [{ by: 'seller', type: 'proposed', price: askPrice, note: note(b.note) }],
    });
    res.status(201).json({ success: true, deal: sellerView(deal), message: 'Sent to the manager' });
  } catch (e) { next(e); }
};

const mine = (req) => (d) => String(d.seller) === String(req.user._id);

exports.sellerAccept = async (req, res, next) => {
  try {
    const deal = await find(req.params.id, next, ['Countered'], mine(req));
    if (!deal) return;
    deal.agreedPrice = lastPrice(deal, 'manager');
    deal.status = 'Agreed';
    push(deal, 'seller', 'accepted', deal.agreedPrice, note(req.body.note));
    await deal.save();
    res.json({ success: true, deal: sellerView(deal), message: 'Deal agreed. The manager will take it forward.' });
  } catch (e) { next(e); }
};
exports.sellerCounter = async (req, res, next) => {
  try {
    const deal = await find(req.params.id, next, ['Countered'], mine(req));
    if (!deal) return;
    const p = price(req.body.price);
    if (!p) return next(new ErrorHandler('Please enter a valid price', 400));
    if (rounds(deal) >= MAX_ROUNDS) return next(new ErrorHandler('Too many offers on this deal. Please talk to the manager directly.', 400));
    deal.status = 'Proposed';
    push(deal, 'seller', 'countered', p, note(req.body.note));
    await deal.save();
    res.json({ success: true, deal: sellerView(deal), message: 'New price sent to the manager' });
  } catch (e) { next(e); }
};
exports.sellerWithdraw = async (req, res, next) => {
  try {
    const deal = await find(req.params.id, next, OPEN, mine(req));
    if (!deal) return;
    deal.status = 'Closed'; deal.closedBy = 'seller';
    push(deal, 'seller', 'withdrawn', undefined, note(req.body.note));
    await deal.save();
    res.json({ success: true, deal: sellerView(deal), message: 'Deal withdrawn' });
  } catch (e) { next(e); }
};

// ================= Manager =================
exports.managerList = async (req, res, next) => {
  try {
    const deals = await Deal.find().sort({ updatedAt: -1 });
    const sellers = await sellerLookup(deals);
    const c = (s) => deals.filter((d) => d.status === s).length;
    res.json({ success: true, deals: deals.map((d) => staffView(d, sellers)), counts: { Proposed: c('Proposed'), Countered: c('Countered'), Agreed: c('Agreed'), PendingAdmin: c('PendingAdmin') } });
  } catch (e) { next(e); }
};
exports.managerCount = async (req, res, next) => {
  try {
    res.json({ success: true, pending: (await Deal.countDocuments({ status: 'Proposed' })) + (await Deal.countDocuments({ status: 'Agreed' })) });
  } catch (e) { next(e); }
};

exports.managerAccept = async (req, res, next) => {
  try {
    const deal = await find(req.params.id, next, ['Proposed']);
    if (!deal) return;
    deal.agreedPrice = lastPrice(deal, 'seller');
    deal.status = 'Agreed';
    push(deal, 'manager', 'accepted', deal.agreedPrice, note(req.body.note));
    await deal.save();
    res.json({ success: true, deal: staffView(deal), message: 'Price agreed. Set the selling price and send it to the admin.' });
  } catch (e) { next(e); }
};
exports.managerCounter = async (req, res, next) => {
  try {
    const deal = await find(req.params.id, next, ['Proposed', 'Countered']);
    if (!deal) return;
    const p = price(req.body.price);
    if (!p) return next(new ErrorHandler('Please enter a valid price', 400));
    if (rounds(deal) >= MAX_ROUNDS) return next(new ErrorHandler('Too many offers on this deal. Please close it or accept a price.', 400));
    deal.status = 'Countered';
    push(deal, 'manager', 'countered', p, note(req.body.note));
    await deal.save();
    await notifySeller(deal, 'The manager sent a new price', `<p>For <b>${esc(deal.productName)}</b> the manager offered <b>₹${p}</b> per unit. Please log in to accept or reply.</p>`);
    res.json({ success: true, deal: staffView(deal), message: 'Counter offer sent to the seller' });
  } catch (e) { next(e); }
};
exports.managerReject = async (req, res, next) => {
  try {
    const deal = await find(req.params.id, next, OPEN);
    if (!deal) return;
    deal.status = 'Closed'; deal.closedBy = 'manager';
    push(deal, 'manager', 'rejected', undefined, note(req.body.note));
    await deal.save();
    await notifySeller(deal, 'Update on your item', `<p>The manager could not take <b>${esc(deal.productName)}</b> forward.${note(req.body.note) ? ` Note: ${esc(note(req.body.note))}` : ''}</p>`);
    res.json({ success: true, deal: staffView(deal), message: 'Deal closed' });
  } catch (e) { next(e); }
};
// Agreed -> PendingAdmin : manager customer ka selling price tay karke admin ko bhejta hai
exports.managerSubmit = async (req, res, next) => {
  try {
    const deal = await find(req.params.id, next, ['Agreed']);
    if (!deal) return;
    const sp = price(req.body.sellingPrice);
    if (!sp) return next(new ErrorHandler('Please enter the selling price for customers', 400));
    if (sp < deal.agreedPrice) return next(new ErrorHandler(`Selling price (₹${sp}) cannot be below the price you pay the seller (₹${deal.agreedPrice})`, 400));
    let cut = 0;
    if (req.body.cuttedPrice !== undefined && req.body.cuttedPrice !== '' && Number(req.body.cuttedPrice) !== 0) {
      cut = price(req.body.cuttedPrice);
      if (!cut || cut < sp) return next(new ErrorHandler('MRP (cut price) must be at least the selling price', 400));
    }
    deal.sellingPrice = sp; deal.cuttedPrice = cut; deal.managerNote = note(req.body.note);
    deal.status = 'PendingAdmin';
    push(deal, 'manager', 'submitted', sp, deal.managerNote);
    await deal.save();
    res.json({ success: true, deal: staffView(deal), message: 'Sent to the admin for approval' });
  } catch (e) { next(e); }
};

// ================= Admin (sirf yes / no) =================
exports.adminList = async (req, res, next) => {
  try {
    const deals = (await Deal.find({ status: { $in: ['PendingAdmin', 'Approved', 'Rejected'] } }).sort({ updatedAt: -1 }));
    const sellers = await sellerLookup(deals);
    res.json({ success: true, deals: deals.map((d) => staffView(d, sellers)) });
  } catch (e) { next(e); }
};
exports.adminCount = async (req, res, next) => {
  try { res.json({ success: true, pending: await Deal.countDocuments({ status: 'PendingAdmin' }) }); } catch (e) { next(e); }
};

exports.adminApprove = async (req, res, next) => {
  try {
    const deal = await find(req.params.id, next, ['PendingAdmin']);
    if (!deal) return;
    const product = await Product.create({
      name: deal.productName, description: deal.description, highlights: deal.highlights, brand: deal.brand,
      price: deal.sellingPrice, cuttedPrice: deal.cuttedPrice || 0, category: deal.category, stock: deal.quantity,
      images: deal.images && deal.images.length ? deal.images : [{ public_id: 'sample', url: 'https://via.placeholder.com/150' }],
      seller: deal.seller, dealPrice: deal.agreedPrice, deal: deal._id, isActive: true,
    });
    deal.product = product._id; deal.status = 'Approved'; deal.adminNote = note(req.body.note);
    deal.decidedBy = req.user._id; deal.decidedAt = new Date();
    push(deal, 'admin', 'approved', undefined, deal.adminNote);
    await deal.save();
    await notifySeller(deal, 'Your item is live!', `<p><b>${esc(deal.productName)}</b> (${deal.quantity} units at ₹${deal.agreedPrice} each) is approved and now listed in the store. You earn when a customer receives an order.</p>`);
    res.json({ success: true, deal: staffView(deal), product: { _id: product._id, name: product.name }, message: 'Approved. Product added to the store.' });
  } catch (e) { next(e); }
};
exports.adminReject = async (req, res, next) => {
  try {
    const deal = await find(req.params.id, next, ['PendingAdmin']);
    if (!deal) return;
    deal.status = 'Rejected'; deal.adminNote = note(req.body.note);
    deal.decidedBy = req.user._id; deal.decidedAt = new Date();
    push(deal, 'admin', 'admin_rejected', undefined, deal.adminNote);
    await deal.save();
    await notifySeller(deal, 'Update on your item', `<p>Sorry, <b>${esc(deal.productName)}</b> was not approved for the store this time.</p>`);
    res.json({ success: true, deal: staffView(deal), message: 'Rejected' });
  } catch (e) { next(e); }
};
