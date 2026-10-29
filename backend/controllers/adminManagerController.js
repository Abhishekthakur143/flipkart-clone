const crypto = require('crypto');
const validator = require('validator');
const User = require('../models/User');
const ErrorHandler = require('../utils/errorHandler');

const genPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(10), (b) => chars[b % chars.length]).join('');
};

const view = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  isActive: u.isActive !== false,
  createdAt: u.createdAt,
});

// GET /admin/managers
exports.listManagers = async (req, res, next) => {
  try {
    const managers = await User.find({ role: 'manager' }).sort({ createdAt: -1 });
    res.json({ success: true, managers: managers.map(view) });
  } catch (e) {
    next(e);
  }
};

// POST /admin/managers  { name, email, phone?, password? }
exports.createManager = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').toLowerCase().trim();
    const phone = String(req.body.phone || '').trim();
    if (!name) return next(new ErrorHandler('Please enter the manager name', 400));
    if (!validator.isEmail(email)) return next(new ErrorHandler('Please enter a valid email', 400));

    let password = String(req.body.password || '');
    if (!password) password = genPassword();
    if (password.length < 6) return next(new ErrorHandler('Password should be minimum 6 characters', 400));

    if (await User.findOne({ email })) {
      return next(new ErrorHandler('An account with this email already exists', 400));
    }

    const manager = await User.create({
      name, email, phone, password,
      role: 'manager',
      isVerified: true,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, manager: view(manager), password });
  } catch (e) {
    next(e);
  }
};

// PUT /admin/managers/:id  { name?, phone?, isActive? }
exports.updateManager = async (req, res, next) => {
  try {
    const m = await User.findOne({ _id: req.params.id, role: 'manager' });
    if (!m) return next(new ErrorHandler('Manager not found', 404));
    if (typeof req.body.name === 'string' && req.body.name.trim()) m.name = req.body.name.trim();
    if (typeof req.body.phone === 'string') m.phone = req.body.phone.trim();
    if (typeof req.body.isActive === 'boolean') m.isActive = req.body.isActive;
    await m.save({ validateBeforeSave: true });
    res.json({ success: true, manager: view(m) });
  } catch (e) {
    next(e);
  }
};

// PUT /admin/managers/:id/password : naya password banata hai (ek hi baar dikhta hai)
exports.resetManagerPassword = async (req, res, next) => {
  try {
    const m = await User.findOne({ _id: req.params.id, role: 'manager' });
    if (!m) return next(new ErrorHandler('Manager not found', 404));
    const password = genPassword();
    m.password = password;
    await m.save();
    res.json({ success: true, password });
  } catch (e) {
    next(e);
  }
};

// DELETE /admin/managers/:id
exports.deleteManager = async (req, res, next) => {
  try {
    const m = await User.findOne({ _id: req.params.id, role: 'manager' });
    if (!m) return next(new ErrorHandler('Manager not found', 404));
    await m.deleteOne();
    res.json({ success: true, message: 'Manager deleted' });
  } catch (e) {
    next(e);
  }
};
