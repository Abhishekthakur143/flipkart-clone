const jwt = require('jsonwebtoken');
const DeliveryPartner = require('../models/DeliveryPartner');

// Delivery partners authenticate ONLY with a Bearer token (no shared cookie with the customer login)
exports.isDeliveryPartner = async (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.split(' ')[1] : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Please login as a delivery partner' });
    }
    const decoded = jwt.verify(token, DeliveryPartner.secret());
    if (decoded.type !== 'delivery') throw new Error('wrong token type');

    const partner = await DeliveryPartner.findById(decoded.id);
    if (!partner) return res.status(401).json({ success: false, message: 'Account not found' });
    if (!partner.isActive) {
      return res.status(403).json({ success: false, message: 'Your account is disabled. Contact support.' });
    }
    req.partner = partner;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
