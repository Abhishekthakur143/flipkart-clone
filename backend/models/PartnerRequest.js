const mongoose = require('mongoose');

// Delivery partner banne ki request. Flow:
//   Applied (applicant ne form bhara) -> manager review -> Forwarded (admin ke paas)
//   -> admin yes => Approved (DeliveryPartner account ban jata hai) / no => Rejected
// Manager chahe to khud bhi add kar sakta hai: seedha Forwarded se shuru hota hai.
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxLength: 50 },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'] },
    city: { type: String, required: true, trim: true, maxLength: 60 },
    address: { type: String, default: '', trim: true, maxLength: 300 },
    vehicleType: { type: String, enum: ['Bike', 'Scooter', 'Cycle', 'EV'], default: 'Bike' },
    vehicleNumber: { type: String, default: '', trim: true, uppercase: true, maxLength: 20 },
    licenseNumber: { type: String, default: '', trim: true, maxLength: 30 },
    experience: { type: String, default: '', trim: true, maxLength: 120 },
    message: { type: String, default: '', trim: true, maxLength: 500 },

    source: { type: String, enum: ['applicant', 'manager'], default: 'applicant' },
    status: { type: String, enum: ['Applied', 'Forwarded', 'Approved', 'Rejected'], default: 'Applied', index: true },

    managerNote: { type: String, default: '', maxLength: 500 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,

    adminNote: { type: String, default: '', maxLength: 500 },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: Date,
    rejectedBy: { type: String, enum: ['manager', 'admin'] },

    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PartnerRequest', schema);
