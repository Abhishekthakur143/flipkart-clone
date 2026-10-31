const Pusher = require('pusher');
const { hasValidUnlock, securityEnabled } = require('../middleware/auth');

const MANAGERS = 'private-deals-managers';
const sellerChannel = (id) => `private-deals-seller-${id}`;

let client = null;
let warned = false;
const getPusher = () => {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
    // Vercel logs me dikhega, taaki missing env chhupa na rahe
    if (!warned) {
      console.warn('Pusher env missing on server: realtime is OFF');
      warned = true;
    }
    return null;
  }
  if (!client) {
    client = new Pusher({
      appId: PUSHER_APP_ID, key: PUSHER_KEY, secret: PUSHER_SECRET, cluster: PUSHER_CLUSTER, useTLS: true,
    });
  }
  return client;
};

// Sirf ping jata hai (deal id), koi private data nahi.
// Vercel par function response ke baad freeze ho jata hai, isliye await zaroori hai.
const notifyDeal = async (deal) => {
  const p = getPusher();
  if (!p) return;
  try {
    await p.trigger([MANAGERS, sellerChannel(deal.seller)], 'deal-updated', { dealId: String(deal._id) });
  } catch (e) {
    console.error('Pusher trigger failed:', e.message);
  }
};

// POST /deals/pusher/auth : private channel ki permission
const authChannel = (req, res) => {
  const p = getPusher();
  if (!p) return res.status(503).json({ success: false, message: 'Realtime is not configured' });
  const { socket_id: socketId, channel_name: channel } = req.body || {};
  const u = req.user;
  if (!socketId || !channel || !u || u.isActive === false) return res.status(403).json({ success: false });

  let ok = false;
  if (channel === MANAGERS) {
    if (u.role === 'manager') ok = true;
    // superadmin ko bhi admin-unlock gate paar karna padega
    if (u.role === 'superadmin') ok = !securityEnabled() || hasValidUnlock(req);
  } else if (u.role === 'seller' && channel === sellerChannel(u._id)) {
    ok = true; // seller sirf apna channel sun sakta hai
  }
  if (!ok) return res.status(403).json({ success: false });
  res.send(p.authorizeChannel(socketId, channel));
};

module.exports = { notifyDeal, authChannel, sellerChannel };
