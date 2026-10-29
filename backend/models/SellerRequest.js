const mongoose = require('mongoose');

// "Become a seller" form se aayi request. Sirf manager ke inbox me dikhti hai.
const sellerRequestSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  phone: { type: String, trim: true, default: '' },
  shopName: { type: String, trim: true, maxlength: 120, default: '' },
  city: { type: String, trim: true, maxlength: 80, default: '' },
  sells: { type: String, trim: true, maxlength: 300, default: '' },
  message: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['New', 'Granted', 'Dismissed'], default: 'New', index: true },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  handledAt: Date,
}, { timestamps: true });

module.exports = mongoose.models.SellerRequest || mongoose.model('SellerRequest', sellerRequestSchema);
