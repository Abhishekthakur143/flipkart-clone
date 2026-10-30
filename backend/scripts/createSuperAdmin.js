/*
  Pehla super admin banane ke liye (ek baar, apne computer se):
    cd backend
    SUPERADMIN_EMAIL=you@gmail.com SUPERADMIN_PASSWORD='StrongPass#123' SUPERADMIN_NAME='Abhishek' node scripts/createSuperAdmin.js
  (Windows PowerShell:  $env:SUPERADMIN_EMAIL='you@gmail.com'; $env:SUPERADMIN_PASSWORD='...'; node scripts/createSuperAdmin.js)
  - Email pehle se ho to us account ko superadmin bana deta hai (aur password de diya ho to wahi set karta hai).
  - Backend ki .env me MONGO_URI (jo db.js use karta hai) honi chahiye.
*/
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
if (process.env.NODE_ENV !== 'production') require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const validator = require('validator');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  const email = String(process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
  const password = String(process.env.SUPERADMIN_PASSWORD || '');
  const name = String(process.env.SUPERADMIN_NAME || 'Super Admin').trim();
  if (!validator.isEmail(email)) { console.error('Set SUPERADMIN_EMAIL to a valid email.'); process.exit(1); }
  await connectDB();
  let user = await User.findOne({ email });
  if (!user) {
    if (password.length < 8) { console.error('New account: set SUPERADMIN_PASSWORD (min 8 characters).'); process.exit(1); }
    user = await User.create({ name, email, password, role: 'superadmin', isVerified: true });
    console.log(`Super admin created: ${email}`);
  } else {
    user.role = 'superadmin'; user.isActive = true; user.isVerified = true;
    if (password) { if (password.length < 8) { console.error('SUPERADMIN_PASSWORD must be at least 8 characters.'); process.exit(1); } user.password = password; }
    await user.save();
    console.log(`Existing account promoted to super admin: ${email}${password ? ' (password updated)' : ''}`);
  }
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
