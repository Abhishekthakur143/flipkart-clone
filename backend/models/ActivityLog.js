const mongoose = require('mongoose');

// Kisne kya kiya (sirf badlaav wale kaam). 90 din baad apne aap delete.
const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  role: { type: String, index: true },
  action: { type: String, default: '' },
  method: { type: String },
  path: { type: String },
  status: { type: Number },
  ip: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true, expires: 60 * 60 * 24 * 90 },
});

module.exports = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
