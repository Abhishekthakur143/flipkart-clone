const User = require('../models/User');

// Admin ke "Users" page (aur purane user-edit routes) se koi bhi, yahan tak ki
// super admin khud bhi, kisi super admin account ka role/data nahi badal sakta.
// Super admin ko sirf Super Admin panel -> Accounts page se manage kiya jata hai.
module.exports = async (req, res, next) => {
  try {
    if (!['PUT', 'PATCH', 'DELETE', 'POST'].includes(req.method)) return next();

    const deny = (message) => res.status(403).json({ success: false, message });

    // Yahan se kisi ko super admin bhi nahi banaya ja sakta
    if (req.body && typeof req.body === 'object' && String(req.body.role || '').toLowerCase() === 'superadmin') {
      return deny('Super admin yahan se nahi banaya ja sakta.');
    }

    const m = req.path.match(/\/([a-f\d]{24})(?:\/|$)/i);
    if (m) {
      const target = await User.findById(m[1]).select('role');
      if (target && target.role === 'superadmin') {
        return deny('Super admin account yahan se change nahi ho sakta. Super Admin panel -> Accounts use karo.');
      }
    }
    next();
  } catch (e) { next(e); }
};
