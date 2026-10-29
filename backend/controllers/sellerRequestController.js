const validator = require('validator');
const SellerRequest = require('../models/SellerRequest');
const User = require('../models/User');
const ErrorHandler = require('../utils/errorHandler');
const sendEmail = require('../utils/sendEmail');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isId = (id) => /^[a-f\d]{24}$/i.test(String(id));
const cut = (v, n) => String(v || '').trim().slice(0, n);

// POST /seller/request  (public) - seller ki request sirf managers ko jati hai
exports.apply = async (req, res, next) => {
  try {
    if (req.body.website) return res.status(201).json({ success: true, message: 'Request sent' }); // honeypot (bots)
    const d = {
      name: cut(req.body.name, 80), email: cut(req.body.email, 120).toLowerCase(), phone: cut(req.body.phone, 10),
      shopName: cut(req.body.shopName, 120), city: cut(req.body.city, 80), sells: cut(req.body.sells, 300), message: cut(req.body.message, 1000),
    };
    if (!d.name) return next(new ErrorHandler('Please enter your name', 400));
    if (!validator.isEmail(d.email)) return next(new ErrorHandler('Please enter a valid email', 400));
    if (d.phone && !/^[6-9]\d{9}$/.test(d.phone)) return next(new ErrorHandler('Enter a valid 10-digit mobile number', 400));

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if ((await SellerRequest.countDocuments({ createdAt: { $gte: hourAgo } })) > 100) return next(new ErrorHandler('Too many requests right now. Please try again later.', 429));
    if (await User.findOne({ email: d.email })) return next(new ErrorHandler('An account with this email already exists. Please log in.', 400));
    if (await SellerRequest.findOne({ email: d.email, status: 'New' })) return next(new ErrorHandler('A request with this email is already with the manager', 400));

    await SellerRequest.create(d);

    // Sirf managers ko notification (best-effort: email fail ho to bhi inbox me request dikhegi)
    try {
      const managers = await User.find({ role: 'manager' });
      const to = managers.filter((m) => m.isActive !== false && m.email).map((m) => m.email);
      for (const email of to) {
        await sendEmail({
          email, subject: 'New seller request',
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto"><h2 style="color:#2874f0">New seller request</h2><p><b>${esc(d.name)}</b> (${esc(d.email)}) wants to sell on the store.</p>${d.shopName ? `<p>Shop: ${esc(d.shopName)}${d.city ? `, ${esc(d.city)}` : ''}</p>` : ''}${d.message ? `<p>“${esc(d.message)}”</p>` : ''}<p>Open Manager Panel → Sellers → Requests to give access.</p></div>`,
        }).catch((e) => console.error('Seller request mail failed:', e.message));
      }
    } catch (e) { console.error('Seller request notify failed:', e.message); }

    res.status(201).json({ success: true, message: 'Request sent' });
  } catch (e) { next(e); }
};

// ---------- Manager ----------
exports.managerList = async (req, res, next) => {
  try {
    const requests = await SellerRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (e) { next(e); }
};

exports.dismiss = async (req, res, next) => {
  try {
    const r = isId(req.params.id) ? await SellerRequest.findById(req.params.id) : null;
    if (!r) return next(new ErrorHandler('Request not found', 404));
    if (r.status !== 'New') return next(new ErrorHandler('This request is already handled', 400));
    r.status = 'Dismissed'; r.handledBy = req.user._id; r.handledAt = new Date();
    await r.save();
    res.json({ success: true, message: 'Request dismissed' });
  } catch (e) { next(e); }
};

// sellerController.invite use karta hai jab request se access diya jaye
exports.markGranted = async (id, userId) => {
  if (!isId(id)) return;
  const r = await SellerRequest.findById(id);
  if (r && r.status === 'New') { r.status = 'Granted'; r.handledBy = userId; r.handledAt = new Date(); await r.save(); }
};
