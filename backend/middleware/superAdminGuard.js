const User = require('../models/User');

// /api/v1/admin ke upar: admin (ya koi aur) superadmin role na de sake, aur kisi superadmin account ko
// na badal / hata sake. Admin ke purane user-edit routes me kuch badalne ki zaroorat nahi.
module.exports = async (req, res, next) => {
  try {
    if (!req.user || req.user.role === 'superadmin') return next();
    const deny = (message) => res.status(403).json({ success: false, message });
    if (req.body && typeof req.body === 'object' && String(req.body.role || '').toLowerCase() === 'superadmin') {
      return deny('Only a super admin can create a super admin.');
    }
    if (['PUT', 'PATCH', 'DELETE', 'POST'].includes(req.method)) {
      const m = req.path.match(/\/([a-f\d]{24})(?:\/|$)/i);
      if (m) {
        const target = await User.findById(m[1]);
        if (target && target.role === 'superadmin') return deny('You cannot change a super admin account.');
      }
    }
    next();
  } catch (e) { next(e); }
};
