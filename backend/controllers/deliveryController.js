const crypto = require('crypto');
const validator = require('validator');
const DeliveryPartner = require('../models/DeliveryPartner');
const Order = require('../models/Order');
const ErrorHandler = require('../utils/errorHandler');
const sendEmail = require('../utils/sendEmail');
 
const ACTIVE = ['Assigned', 'Picked Up', 'Out for Delivery'];
const DONE = ['Delivered', 'Failed'];
const CLOSED_ORDER = ['Delivered', 'Cancelled', 'Returned'];
const FAIL_REASONS = [
  'Customer not available',
  'Customer not reachable',
  'Wrong or incomplete address',
  'Customer refused the order',
  'Payment not available (COD)',
  'Other',
];
const OTP_TTL_MS = 12 * 60 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_MS = 30 * 1000;
 
const payout = () => Number(process.env.DELIVERY_PAYOUT) || 40;
const hashOtp = (otp) =>
  crypto.createHmac('sha256', DeliveryPartner.secret()).update(String(otp)).digest('hex');
const code = (o) => o._id.toString().slice(-8).toUpperCase();
const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
 
const partnerJSON = (p) => ({
  id: p._id,
  name: p.name,
  email: p.email,
  phone: p.phone,
  vehicleType: p.vehicleType,
  vehicleNumber: p.vehicleNumber,
  city: p.city,
  isAvailable: p.isAvailable,
  createdAt: p.createdAt,
});
 
// What a partner is allowed to see of an order (no customer email, no payment ids, no OTP hash)
const shape = (o) => {
  const d = o.delivery || {};
  return {
    _id: o._id,
    code: code(o),
    items: o.items.map((i) => ({
      name: i.name, quantity: i.quantity, image: i.image, size: i.size, color: i.color, price: i.price,
    })),
    shippingInfo: o.shippingInfo,
    paymentMethod: o.paymentMethod,
    totalPrice: o.totalPrice,
    amountToCollect: o.paymentMethod === 'COD' && d.status !== 'Delivered' ? o.totalPrice : 0,
    orderStatus: o.orderStatus,
    createdAt: o.createdAt,
    delivery: {
      status: d.status,
      assignedAt: d.assignedAt,
      pickedUpAt: d.pickedUpAt,
      outForDeliveryAt: d.outForDeliveryAt,
      deliveredAt: d.deliveredAt,
      failedAt: d.failedAt,
      failReason: d.failReason,
      attempts: d.attempts,
      payout: d.payout,
      codCollected: d.codCollected,
      otpSentAt: d.otpSentAt,
    },
  };
};
 
const track = (order, status, message, location = '') =>
  order.trackingUpdates.push({ status, message, location });
 
const tokenResponse = (partner, status, res, message) =>
  res.status(status).json({ success: true, token: partner.getJWTToken(), partner: partnerJSON(partner), message });
 
// ---------- Delivery OTP (emailed to the customer who placed the order) ----------
const sendDeliveryOtp = async (order, otp, partnerName) => {
  const smtpReady = process.env.SMTP_HOST && process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD;
  const debug = process.env.NODE_ENV !== 'production' && process.env.OTP_DEBUG === 'true';
  if (debug) console.log(`\n[DEV DELIVERY OTP] order #${code(order)}: ${otp}\n`);
  if (!smtpReady) {
    if (debug) return;
    throw new Error('SMTP is not configured');
  }
  const email = order.user && order.user.email;
  if (!email) throw new Error('Customer email not found');
  await sendEmail({
    email,
    subject: `Delivery OTP for order #${code(order)}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:460px">
      <h2 style="color:#2874f0;margin:0 0 8px">Your order is out for delivery</h2>
      <p>Hi ${order.shippingInfo.name}, ${partnerName} is on the way with order <b>#${code(order)}</b>.</p>
      <p>Share this OTP with the delivery partner <b>only when you receive your package</b>:</p>
      <p style="font-size:34px;letter-spacing:8px;font-weight:bold;margin:10px 0">${otp}</p>
      <p style="color:#666">Do not share it before the package is in your hands.</p></div>`,
  });
};
 
const newOtpFor = async (order, partnerName) => {
  const otp = String(crypto.randomInt(100000, 1000000));
  await sendDeliveryOtp(order, otp, partnerName); // throws before we change anything if email fails
  order.delivery.otpHash = hashOtp(otp);
  order.delivery.otpExpire = new Date(Date.now() + OTP_TTL_MS);
  order.delivery.otpAttempts = 0;
  order.delivery.otpSentAt = new Date();
};
 
const clearOtp = (order) => {
  order.delivery.otpHash = undefined;
  order.delivery.otpExpire = undefined;
  order.delivery.otpAttempts = 0;
};
 
// ---------- Auth ----------
// NOTE: route me ab use nahi hota (partner sirf admin banata hai). Chaaho to hata do.
exports.register = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').toLowerCase().trim();
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '');
    const { vehicleType, vehicleNumber, city } = req.body;
 
    if (!name || !email || !phone || !password) return next(new ErrorHandler('Name, email, phone and password are required', 400));
    if (!validator.isEmail(email)) return next(new ErrorHandler('Please enter a valid email', 400));
    if (!/^[6-9]\d{9}$/.test(phone)) return next(new ErrorHandler('Enter a valid 10-digit mobile number', 400));
    if (password.length < 6 || password.length > 72) return next(new ErrorHandler('Password must be 6 to 72 characters', 400));
 
    if (await DeliveryPartner.findOne({ email })) {
      return next(new ErrorHandler('A delivery partner already exists with this email', 400));
    }
    const partner = await DeliveryPartner.create({ name, email, phone, password, vehicleType, vehicleNumber, city });
    tokenResponse(partner, 201, res, 'Welcome aboard!');
  } catch (e) {
    next(e);
  }
};
 
exports.login = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    if (!email || !password) return next(new ErrorHandler('Please enter email and password', 400));
 
    const partner = await DeliveryPartner.findOne({ email }).select('+password +loginAttempts +lockUntil');
    if (!partner) return next(new ErrorHandler('Invalid email or password', 401));
 
    if (partner.lockUntil && partner.lockUntil > Date.now()) {
      return next(new ErrorHandler('Too many failed attempts. Try again in a few minutes.', 429));
    }
    if (!(await partner.comparePassword(password))) {
      partner.loginAttempts = (partner.loginAttempts || 0) + 1;
      if (partner.loginAttempts >= 5) {
        partner.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        partner.loginAttempts = 0;
      }
      await partner.save({ validateBeforeSave: false });
      return next(new ErrorHandler('Invalid email or password', 401));
    }
    if (!partner.isActive) return next(new ErrorHandler('Your account is disabled. Contact support.', 403));
 
    partner.loginAttempts = 0;
    partner.lockUntil = undefined;
    await partner.save({ validateBeforeSave: false });
    tokenResponse(partner, 200, res, 'Login successful');
  } catch (e) {
    next(e);
  }
};
 
exports.getMe = (req, res) => res.json({ success: true, partner: partnerJSON(req.partner) });
 
exports.updateMe = async (req, res, next) => {
  try {
    const p = req.partner;
    const { name, phone, vehicleType, vehicleNumber, city } = req.body;
    if (name !== undefined) p.name = String(name).trim();
    if (phone !== undefined) p.phone = String(phone).trim();
    if (vehicleType !== undefined) p.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) p.vehicleNumber = vehicleNumber;
    if (city !== undefined) p.city = city;
    await p.save();
    res.json({ success: true, partner: partnerJSON(p), message: 'Profile updated' });
  } catch (e) {
    next(e);
  }
};
 
exports.updatePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword || String(newPassword).length < 6 || String(newPassword).length > 72) {
      return next(new ErrorHandler('Enter your current password and a new password of 6 to 72 characters', 400));
    }
    const p = await DeliveryPartner.findById(req.partner._id).select('+password');
    if (!(await p.comparePassword(String(oldPassword)))) return next(new ErrorHandler('Current password is incorrect', 400));
    p.password = String(newPassword);
    await p.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (e) {
    next(e);
  }
};
 
exports.setAvailability = async (req, res, next) => {
  try {
    req.partner.isAvailable = !!req.body.isAvailable;
    await req.partner.save({ validateBeforeSave: false });
    res.json({ success: true, isAvailable: req.partner.isAvailable });
  } catch (e) {
    next(e);
  }
};
 
// ---------- Orders ----------
// otpExpire aur otpAttempts bhi select karte hain, warna OTP hamesha expired dikhta
const myOrder = (req, withOtp = false) => {
  let q = Order.findOne({ _id: req.params.id, 'delivery.partner': req.partner._id }).populate('user', 'email');
  if (withOtp) q = q.select('+delivery.otpHash +delivery.otpExpire +delivery.otpAttempts');
  return q;
};
 
const guard = (order, next) => {
  if (!order) { next(new ErrorHandler('Order not found', 404)); return false; }
  if (CLOSED_ORDER.includes(order.orderStatus)) {
    next(new ErrorHandler(`This order is already ${order.orderStatus.toLowerCase()}`, 400));
    return false;
  }
  return true;
};
 
exports.listOrders = async (req, res, next) => {
  try {
    const group = req.query.status === 'completed' ? DONE : ACTIVE;
    const sort = group === ACTIVE ? { 'delivery.assignedAt': 1 } : { updatedAt: -1 };
    const filter = { 'delivery.partner': req.partner._id, 'delivery.status': { $in: group } };
    if (group === ACTIVE) filter.orderStatus = { $nin: CLOSED_ORDER }; // admin cancelled/returned it => disappears
    const orders = await Order.find(filter)
      .sort(sort)
      .limit(group === ACTIVE ? 100 : 150);
    res.json({ success: true, orders: orders.map(shape), count: orders.length });
  } catch (e) {
    next(e);
  }
};
 
exports.getOrder = async (req, res, next) => {
  try {
    const order = await myOrder(req);
    if (!order) return next(new ErrorHandler('Order not found', 404));
    res.json({ success: true, order: shape(order) });
  } catch (e) {
    next(e);
  }
};
 
exports.pickup = async (req, res, next) => {
  try {
    const order = await myOrder(req);
    if (!guard(order, next)) return;
    if (order.delivery.status !== 'Assigned') return next(new ErrorHandler('Order is not waiting for pickup', 400));
 
    order.delivery.status = 'Picked Up';
    order.delivery.pickedUpAt = new Date();
    order.orderStatus = 'Shipped';
    track(order, 'Shipped', `Picked up by delivery partner ${req.partner.name}`, 'Delivery hub');
    await order.save();
    res.json({ success: true, order: shape(order), message: 'Marked as picked up' });
  } catch (e) {
    next(e);
  }
};
 
exports.outForDelivery = async (req, res, next) => {
  try {
    const order = await myOrder(req, true);
    if (!guard(order, next)) return;
    if (order.delivery.status !== 'Picked Up') return next(new ErrorHandler('Pick up the order first', 400));
 
    try {
      await newOtpFor(order, req.partner.name);
    } catch (err) {
      console.error('Delivery OTP email error:', err.message);
      return next(new ErrorHandler('Could not email the delivery OTP to the customer. Check SMTP settings.', 502));
    }
    order.delivery.status = 'Out for Delivery';
    order.delivery.outForDeliveryAt = new Date();
    order.orderStatus = 'Out for Delivery';
    track(order, 'Out for Delivery', `${req.partner.name} is out to deliver your order`, order.shippingInfo.city);
    await order.save();
    res.json({ success: true, order: shape(order), message: 'Customer has been emailed the delivery OTP' });
  } catch (e) {
    next(e);
  }
};
 
exports.resendOtp = async (req, res, next) => {
  try {
    const order = await myOrder(req, true);
    if (!guard(order, next)) return;
    if (order.delivery.status !== 'Out for Delivery') return next(new ErrorHandler('Order is not out for delivery', 400));
 
    const last = order.delivery.otpSentAt ? order.delivery.otpSentAt.getTime() : 0;
    const left = Math.ceil((OTP_COOLDOWN_MS - (Date.now() - last)) / 1000);
    if (left > 0) return next(new ErrorHandler(`Please wait ${left}s before resending`, 429));
 
    try {
      await newOtpFor(order, req.partner.name);
    } catch (err) {
      console.error('Delivery OTP email error:', err.message);
      return next(new ErrorHandler('Could not email the delivery OTP to the customer.', 502));
    }
    await order.save();
    res.json({ success: true, order: shape(order), message: 'New OTP emailed to the customer' });
  } catch (e) {
    next(e);
  }
};
 
exports.deliver = async (req, res, next) => {
  try {
    const otp = String(req.body.otp || '').trim();
    if (!/^\d{6}$/.test(otp)) return next(new ErrorHandler('Enter the 6-digit OTP from the customer', 400));
 
    const order = await myOrder(req, true);
    if (!guard(order, next)) return;
    const d = order.delivery;
    if (d.status !== 'Out for Delivery') return next(new ErrorHandler('Order is not out for delivery', 400));
 
    if (!d.otpHash) {
      return next(new ErrorHandler('No active OTP found. Tap "Resend OTP".', 400));
    }
    if (!d.otpExpire || new Date(d.otpExpire).getTime() < Date.now()) {
      return next(new ErrorHandler('OTP expired. Tap "Resend OTP".', 400));
    }
    if ((d.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
      clearOtp(order);
      await order.save();
      return next(new ErrorHandler('Too many wrong attempts. Tap "Resend OTP" for a new code.', 429));
    }
 
    const given = Buffer.from(hashOtp(otp), 'hex');
    const real = Buffer.from(d.otpHash, 'hex');
    if (given.length !== real.length || !crypto.timingSafeEqual(given, real)) {
      d.otpAttempts = (d.otpAttempts || 0) + 1;
      await order.save();
      const left = OTP_MAX_ATTEMPTS - d.otpAttempts;
      return next(new ErrorHandler(`Wrong OTP. ${left} attempt${left === 1 ? '' : 's'} left.`, 400));
    }
 
    d.status = 'Delivered';
    d.deliveredAt = new Date();
    d.payout = payout();
    clearOtp(order);
    order.orderStatus = 'Delivered';
    order.deliveredAt = d.deliveredAt;
    if (order.paymentMethod === 'COD') {
      d.codCollected = order.totalPrice;
      order.paymentInfo = { id: `COD_${order._id}`, status: 'Paid on Delivery' };
    }
    track(order, 'Delivered', 'Order has been delivered', order.shippingInfo.city);
    await order.save();
    res.json({ success: true, order: shape(order), message: 'Delivered! Great job.' });
  } catch (e) {
    next(e);
  }
};
 
exports.fail = async (req, res, next) => {
  try {
    const reason = String(req.body.reason || '');
    if (!FAIL_REASONS.includes(reason)) return next(new ErrorHandler('Please pick a valid reason', 400));
 
    const order = await myOrder(req, true);
    if (!guard(order, next)) return;
    if (order.delivery.status !== 'Out for Delivery') return next(new ErrorHandler('Order is not out for delivery', 400));
 
    order.delivery.status = 'Failed';
    order.delivery.failedAt = new Date();
    order.delivery.failReason = reason;
    order.delivery.attempts = (order.delivery.attempts || 0) + 1;
    clearOtp(order);
    order.orderStatus = 'Shipped';
    track(order, 'Delivery Attempt Failed', reason, order.shippingInfo.city);
    await order.save();
    res.json({ success: true, order: shape(order), message: 'Marked as failed delivery' });
  } catch (e) {
    next(e);
  }
};
 
// ---------- Stats ----------
exports.stats = async (req, res, next) => {
  try {
    const orders = await Order.find({ 'delivery.partner': req.partner._id }).select('delivery totalPrice paymentMethod');
    const today = dayKey(Date.now());
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const t = new Date(Date.now() - i * 864e5);
      days.push({
        key: dayKey(t),
        label: t.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' }),
        delivered: 0,
        earnings: 0,
      });
    }
    const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
    const monthKey = today.slice(0, 7);
 
    const s = {
      today: { assigned: 0, delivered: 0, failed: 0, earnings: 0 },
      totals: { delivered: 0, failed: 0, active: 0, earnings: 0, codCollected: 0, monthEarnings: 0, successRate: 0 },
    };
    for (const o of orders) {
      const d = o.delivery;
      if (d.assignedAt && dayKey(d.assignedAt) === today) s.today.assigned++;
      if (ACTIVE.includes(d.status)) s.totals.active++;
      if (d.status === 'Delivered' && d.deliveredAt) {
        const k = dayKey(d.deliveredAt);
        s.totals.delivered++;
        s.totals.earnings += d.payout || 0;
        s.totals.codCollected += d.codCollected || 0;
        if (k.startsWith(monthKey)) s.totals.monthEarnings += d.payout || 0;
        if (k === today) { s.today.delivered++; s.today.earnings += d.payout || 0; }
        if (byKey[k]) { byKey[k].delivered++; byKey[k].earnings += d.payout || 0; }
      }
      if (d.status === 'Failed' && d.failedAt) {
        s.totals.failed++;
        if (dayKey(d.failedAt) === today) s.today.failed++;
      }
    }
    const finished = s.totals.delivered + s.totals.failed;
    s.totals.successRate = finished ? Math.round((s.totals.delivered / finished) * 100) : 0;
    res.json({ success: true, ...s, weekly: days, payoutPerDelivery: payout() });
  } catch (e) {
    next(e);
  }
};
 
// ---------- Admin helpers (used to assign orders to partners) ----------
exports.listPartners = async (req, res, next) => {
  try {
    const partners = await DeliveryPartner.find().select('name email phone vehicleType city isActive isAvailable').sort({ name: 1 });
    const load = await Order.aggregate([
      { $match: { 'delivery.status': { $in: ACTIVE }, orderStatus: { $nin: CLOSED_ORDER } } },
      { $group: { _id: '$delivery.partner', n: { $sum: 1 } } },
    ]);
    const byId = Object.fromEntries(load.map((l) => [String(l._id), l.n]));
    res.json({
      success: true,
      partners: partners.map((p) => ({ ...p.toObject(), activeOrders: byId[String(p._id)] || 0 })),
    });
  } catch (e) {
    next(e);
  }
};
 
exports.assignOrder = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findById(req.body.partnerId);
    if (!partner || !partner.isActive) return next(new ErrorHandler('Delivery partner not found or disabled', 404));
 
    const order = await Order.findById(req.params.orderId).select('+delivery.otpHash');
    if (!order) return next(new ErrorHandler('Order not found', 404));
    if (CLOSED_ORDER.includes(order.orderStatus)) {
      return next(new ErrorHandler(`Cannot assign an order that is ${order.orderStatus.toLowerCase()}`, 400));
    }
    // Delivery boy gets the order only AFTER the admin has confirmed it
    const alreadyAssigned = !!order.delivery.partner;
    if (order.orderStatus === 'Processing' || (!alreadyAssigned && order.orderStatus !== 'Confirmed')) {
      return next(new ErrorHandler('Confirm the order first, then assign a delivery partner', 400));
    }
 
    const attempts = order.delivery.attempts || 0;
    order.delivery.partner = partner._id;
    order.delivery.status = 'Assigned';
    order.delivery.assignedAt = new Date();
    order.delivery.pickedUpAt = undefined;
    order.delivery.outForDeliveryAt = undefined;
    order.delivery.failedAt = undefined;
    order.delivery.failReason = undefined;
    order.delivery.attempts = attempts;
    order.delivery.payout = 0;
    clearOtp(order);
    track(order, order.orderStatus, `Assigned to delivery partner ${partner.name}`);
    await order.save();
    res.json({ success: true, message: `Order assigned to ${partner.name}` });
  } catch (e) {
    next(e);
  }
};
 
// ---------- Admin: partner management (routes: /admin/partners*) ----------
exports.createPartner = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').toLowerCase().trim();
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '');
    const { vehicleType, vehicleNumber, city } = req.body;
 
    if (!name || !email || !phone || !password) return next(new ErrorHandler('Name, email, phone and password are required', 400));
    if (!validator.isEmail(email)) return next(new ErrorHandler('Please enter a valid email', 400));
    if (!/^[6-9]\d{9}$/.test(phone)) return next(new ErrorHandler('Enter a valid 10-digit mobile number', 400));
    if (password.length < 6 || password.length > 72) return next(new ErrorHandler('Password must be 6 to 72 characters', 400));
 
    if (await DeliveryPartner.findOne({ email })) {
      return next(new ErrorHandler('A delivery partner already exists with this email', 400));
    }
    const partner = await DeliveryPartner.create({ name, email, phone, password, vehicleType, vehicleNumber, city });
    res.status(201).json({ success: true, partner: partnerJSON(partner), message: 'Delivery partner created' });
  } catch (e) {
    next(e);
  }
};
 
exports.updatePartner = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findById(req.params.id);
    if (!partner) return next(new ErrorHandler('Delivery partner not found', 404));
 
    const { name, email, phone, vehicleType, vehicleNumber, city, isActive } = req.body;
    if (name !== undefined) partner.name = String(name).trim();
    if (email !== undefined) {
      const em = String(email).toLowerCase().trim();
      if (!validator.isEmail(em)) return next(new ErrorHandler('Please enter a valid email', 400));
      if (em !== partner.email && (await DeliveryPartner.findOne({ email: em }))) {
        return next(new ErrorHandler('Another partner already uses this email', 400));
      }
      partner.email = em;
    }
    if (phone !== undefined) {
      const ph = String(phone).trim();
      if (!/^[6-9]\d{9}$/.test(ph)) return next(new ErrorHandler('Enter a valid 10-digit mobile number', 400));
      partner.phone = ph;
    }
    if (vehicleType !== undefined) partner.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) partner.vehicleNumber = vehicleNumber;
    if (city !== undefined) partner.city = city;
    if (isActive !== undefined) partner.isActive = !!isActive;
 
    await partner.save();
    res.json({ success: true, partner: { ...partnerJSON(partner), isActive: partner.isActive }, message: 'Partner updated' });
  } catch (e) {
    next(e);
  }
};
 
exports.deletePartner = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findById(req.params.id);
    if (!partner) return next(new ErrorHandler('Delivery partner not found', 404));
 
    const active = await Order.countDocuments({
      'delivery.partner': partner._id,
      'delivery.status': { $in: ACTIVE },
      orderStatus: { $nin: CLOSED_ORDER },
    });
    if (active > 0) {
      return next(new ErrorHandler(`Partner has ${active} active order(s). Reassign them first, or disable the partner instead.`, 400));
    }
    await partner.deleteOne();
    res.json({ success: true, message: 'Delivery partner deleted' });
  } catch (e) {
    next(e);
  }
};
 
exports.resetPartnerPassword = async (req, res, next) => {
  try {
    const newPassword = String(req.body.newPassword || req.body.password || '');
    if (newPassword.length < 6 || newPassword.length > 72) {
      return next(new ErrorHandler('Password must be 6 to 72 characters', 400));
    }
    const partner = await DeliveryPartner.findById(req.params.id).select('+password +loginAttempts +lockUntil');
    if (!partner) return next(new ErrorHandler('Delivery partner not found', 404));
 
    partner.password = newPassword; // model ka pre('save') hash karega (updatePassword bhi yehi karta hai)
    partner.loginAttempts = 0;
    partner.lockUntil = undefined; // locked account bhi unlock ho jaata hai
    await partner.save();
    res.json({ success: true, message: 'Password reset successful' });
  } catch (e) {
    next(e);
  }
};
 