const mongoose = require('mongoose');

// Seller ka verification record (User se 1-1). Account manager "Grant access" se banata hai.
// Status: Invited (access mila, form baaki) -> Pending (form bhara, manager review) -> Verified / Rejected
// trusted: pehla product bik jaye (Delivered) to apne aap true ho jata hai.
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inviteTokenHash: { type: String, select: false },
    inviteExpire: { type: Date, select: false },

    shopName: { type: String, default: '', trim: true, maxLength: 120 },
    shopType: { type: String, default: '', trim: true, maxLength: 80 },
    ownerName: { type: String, default: '', trim: true, maxLength: 80 },
    phone: { type: String, default: '', trim: true },
    shopAddress: { type: String, default: '', trim: true, maxLength: 300 },
    city: { type: String, default: '', trim: true, maxLength: 60 },
    state: { type: String, default: '', trim: true, maxLength: 60 },
    pincode: { type: String, default: '', trim: true },
    gstNumber: { type: String, default: '', trim: true, uppercase: true, maxLength: 15 },
    idType: { type: String, enum: ['', 'Aadhaar', 'PAN', 'Voter ID', 'Driving Licence', 'Passport'], default: '' },
    idNumber: { type: String, default: '', trim: true, maxLength: 30 },
    yearsInBusiness: { type: Number, default: 0, min: 0, max: 100 },
    website: { type: String, default: '', trim: true, maxLength: 200 },
    sells: { type: String, default: '', trim: true, maxLength: 300 }, // kya becha jata hai
    payoutDetails: { type: String, default: '', trim: true, maxLength: 200 }, // UPI id / bank
    shopPhoto: { public_id: { type: String, default: '' }, url: { type: String, default: '' } },

    status: { type: String, enum: ['Invited', 'Pending', 'Verified', 'Rejected'], default: 'Invited', index: true },
    submittedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    rejectReason: { type: String, default: '', maxLength: 500 },

    trusted: { type: Boolean, default: false },
    trustedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('SellerProfile', schema);
