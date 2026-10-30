const ActivityLog = require('../models/ActivityLog');

// Sirf badlaav wale requests. Body kabhi store nahi hoti (passwords wagairah ke liye).
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const LOGGED_ROLES = new Set(['superadmin', 'admin', 'manager', 'seller']);

// [regex, label]: pehla match jeetta hai. Path me id ki jagah :id aata hai.
const LABELS = [
  [/^\/admin\/security\/unlock$/, 'Unlocked admin panel'],
  [/^\/admin\/security\/setup$/, 'Set up admin security'],
  [/^\/admin\/managers$/, 'Created a manager'],
  [/^\/admin\/managers\/:id\/password$/, 'Reset a manager password'],
  [/^\/admin\/managers\/:id$/, 'Updated/removed a manager'],
  [/^\/superadmin\/delivery-partners\/:id\/open$/, 'Opened the delivery app as a partner'],
  [/^\/superadmin\/accounts$/, 'Created an account'],
  [/^\/superadmin\/accounts\/:id\/password$/, 'Reset an account password'],
  [/^\/superadmin\/accounts\/:id$/, 'Changed/removed an account'],
  [/^\/partner-requests\/manager\/add$/, 'Added a delivery partner request'],
  [/^\/partner-requests\/manager\/:id\/forward$/, 'Forwarded a partner request to admin'],
  [/^\/partner-requests\/manager\/:id\/reject$/, 'Rejected a partner request'],
  [/^\/partner-requests\/admin\/:id\/approve$/, 'Approved a delivery partner'],
  [/^\/partner-requests\/admin\/:id\/reject$/, 'Rejected a delivery partner'],
  [/^\/manager\/orders\/:id\/confirm$/, 'Confirmed an order'],
  [/^\/manager\/assign\/:id$/, 'Assigned an order to a delivery partner'],
  [/^\/seller\/manager\/invite$/, 'Granted seller access'],
  [/^\/seller\/manager\/:id\/verify$/, 'Verified a seller'],
  [/^\/seller\/manager\/:id\/reject$/, 'Sent a seller form back'],
  [/^\/seller\/manager\/:id\/resend$/, 'Sent a new seller link'],
  [/^\/seller\/manager\/:id\/active$/, 'Enabled/disabled a seller'],
  [/^\/seller\/manager\/requests\/:id\/dismiss$/, 'Dismissed a seller request'],
  [/^\/seller\/profile$/, 'Submitted seller verification form'],
  [/^\/deals\/seller$/, 'Proposed an item'],
  [/^\/deals\/seller\/:id\/(accept|counter|withdraw)$/, 'Seller replied on a deal'],
  [/^\/deals\/manager\/:id\/accept$/, 'Accepted seller price'],
  [/^\/deals\/manager\/:id\/counter$/, 'Counter-offered a deal'],
  [/^\/deals\/manager\/:id\/reject$/, 'Closed a deal'],
  [/^\/deals\/manager\/:id\/submit$/, 'Sent a deal to admin'],
  [/^\/deals\/admin\/:id\/approve$/, 'Approved a product deal'],
  [/^\/deals\/admin\/:id\/reject$/, 'Rejected a product deal'],
  [/^\/admin\/users\/:id/, 'Changed a user'],
  [/^\/admin\/orders/, 'Updated an order'],
  [/^\/orders\/admin/, 'Updated an order'],
  [/^\/products/, 'Changed a product'],
  [/^\/categories/, 'Changed a category'],
  [/^\/coupons/, 'Changed a coupon'],
  [/^\/delivery\/admin/, 'Changed delivery settings'],
];

const normalize = (p) => p.replace(/^\/api\/v1/, '').replace(/\/[a-f\d]{24}(?=\/|$)/gi, '/:id');
const label = (method, norm) => {
  const hit = LABELS.find(([re]) => re.test(norm));
  return hit ? hit[1] : `${method} ${norm}`;
};

const build = (req, res) => {
  const u = req.user;
  const raw = (req.originalUrl || '').split('?')[0];
  const norm = normalize(raw);
  const failedUnlock = /\/admin\/security\/unlock$/.test(raw) && [400, 401, 403, 429].includes(res.statusCode);
  if (res.statusCode >= 400 && !failedUnlock) return null;
  if (!u || !LOGGED_ROLES.has(u.role)) return null;
  return {
    user: u._id, name: u.name, email: u.email, role: u.role,
    action: failedUnlock ? 'FAILED admin unlock attempt' : label(req.method, norm),
    method: req.method, path: raw.slice(0, 200), status: res.statusCode,
    ip: String(req.ip || '').slice(0, 64),
  };
};

// Response bhejne se pehle log likhta hai (Vercel jaise serverless par "finish" ke baad likhna cut ho jata hai).
module.exports = (req, res, next) => {
  if (!MUTATING.has(req.method)) return next();
  const end = res.end;
  res.end = function patchedEnd(...args) {
    res.end = end;
    let rec = null;
    try { rec = build(req, res); } catch (e) { console.error('Activity build failed:', e.message); }
    if (!rec) return end.apply(this, args);
    ActivityLog.create(rec)
      .catch((e) => console.error('Activity log failed:', e.message))
      .then(() => end.apply(this, args));
    return this;
  };
  next();
};
module.exports.label = label;
module.exports.normalize = normalize;
