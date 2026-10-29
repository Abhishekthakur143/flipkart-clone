const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ---------- Admin unlock token (second gate, on top of normal login) ----------
// Env (sab optional):
//   ADMIN_UNLOCK_MINUTES  default 30 (min 5, max 240)
//   ADMIN_UNLOCK_SECRET   default JWT_SECRET
//   ADMIN_SECURITY_OFF    "true" = emergency switch, gate band (default: gate ON)
const unlockMinutes = () =>
  Math.min(Math.max(Number(process.env.ADMIN_UNLOCK_MINUTES) || 30, 5), 240);

// ":admin-unlock" suffix => ye token kabhi normal login token ki tarah accept nahi hoga
const unlockSecret = () =>
  `${process.env.ADMIN_UNLOCK_SECRET || process.env.JWT_SECRET}:admin-unlock`;

const securityEnabled = () => process.env.ADMIN_SECURITY_OFF !== 'true';

const signAdminUnlock = (user) =>
  jwt.sign({ id: String(user._id), purpose: 'admin-unlock' }, unlockSecret(), {
    expiresIn: `${unlockMinutes()}m`,
  });

// Header "X-Admin-Unlock" me valid token hai aur isi user ka hai?
const hasValidUnlock = (req) => {
  const token = req.headers['x-admin-unlock'];
  if (!token || !req.user) return false;
  try {
    const decoded = jwt.verify(String(token), unlockSecret());
    return decoded.purpose === 'admin-unlock' && decoded.id === String(req.user._id);
  } catch {
    return false;
  }
};

exports.unlockMinutes = unlockMinutes;
exports.securityEnabled = securityEnabled;
exports.signAdminUnlock = signAdminUnlock;
exports.hasValidUnlock = hasValidUnlock;

// Check if user is authenticated
exports.isAuthenticated = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Please login to access this resource',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

// Sirf role check (admin hona chahiye). Unlock page ke apne routes ke liye.
exports.isAdminRole = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.',
    });
  }
};

// Admin + panel unlocked. Saare admin routes isi se guard hain,
// isliye baaki route files badalne ki zaroorat nahi.
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.',
    });
  }
  if (securityEnabled() && !hasValidUnlock(req)) {
    return res.status(403).json({
      success: false,
      code: 'ADMIN_LOCKED',
      message: 'Admin panel is locked. Verify your identity to continue.',
    });
  }
  next();
};

// Manager panel: sirf role 'manager' (aur account active). Admin yahan nahi aata,
// kyunki manager ka dashboard sirf manager ka hai.
exports.isManager = (req, res, next) => {
  if (!req.user || req.user.role !== 'manager') {
    return res.status(403).json({ success: false, message: 'Access denied. Manager only.' });
  }
  if (req.user.isActive === false) {
    return res.status(403).json({ success: false, message: 'Your manager account is disabled. Contact the admin.' });
  }
  next();
};

// Seller panel: sirf role 'seller' (aur account active)
exports.isSeller = (req, res, next) => {
  if (!req.user || req.user.role !== 'seller') {
    return res.status(403).json({ success: false, message: 'Access denied. Seller only.' });
  }
  if (req.user.isActive === false) {
    return res.status(403).json({ success: false, message: 'Your seller account is disabled. Contact the manager.' });
  }
  next();
};
