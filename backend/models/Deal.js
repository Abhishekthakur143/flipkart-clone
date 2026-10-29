const mongoose = require('mongoose');

// Seller aur manager ke beech item ka deal.
//   Proposed    : seller ne rate bataya, manager ka jawab baaki
//   Countered   : manager ne apna rate bataya, seller ka jawab baaki
//   Agreed      : dono ek rate par sahmat, manager selling price daal kar admin ko bhejega
//   PendingAdmin: admin ke yes / no ka intezaar
//   Approved    : admin ne yes kaha, Product ban gaya
//   Rejected    : admin ne no kaha
//   Closed      : seller ne hata liya ya manager ne mana kar diya
const eventSchema = new mongoose.Schema(
  {
    by: { type: String, enum: ['seller', 'manager', 'admin'], required: true },
    type: { type: String, required: true }, // proposed, countered, accepted, rejected, withdrawn, submitted, approved, admin_rejected
    price: Number,
    note: { type: String, default: '', maxLength: 500 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productName: { type: String, required: true, trim: true, maxLength: 200 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: String, default: '', trim: true, maxLength: 80 },
    description: { type: String, required: true, trim: true, maxLength: 3000 },
    highlights: [{ type: String, maxLength: 200 }],
    images: [{ public_id: String, url: String }],
    quantity: { type: Number, required: true, min: 1, max: 100000 },

    askPrice: { type: Number, required: true, min: 1 },    // seller ne shuru me kitna manga (per unit)
    costPrice: { type: Number, required: true, min: 0 },   // seller ka apna khareed rate, sirf seller ko dikhta hai
    agreedPrice: Number,                                    // dono ka tay rate (store seller ko itna dega)
    sellingPrice: Number,                                   // customer ko dikhne wala price (manager tay karta hai)
    cuttedPrice: { type: Number, default: 0 },              // MRP / kata hua price (optional)

    events: [eventSchema],
    status: {
      type: String,
      enum: ['Proposed', 'Countered', 'Agreed', 'PendingAdmin', 'Approved', 'Rejected', 'Closed'],
      default: 'Proposed',
      index: true,
    },
    managerNote: { type: String, default: '', maxLength: 500 }, // admin ke liye
    adminNote: { type: String, default: '', maxLength: 500 },
    closedBy: { type: String, enum: ['seller', 'manager'] },

    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Deal', schema);
