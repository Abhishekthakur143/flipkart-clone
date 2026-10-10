// Dev helper: creates a demo delivery partner and assigns some of YOUR existing orders to them.
// Run from the backend folder:   node seedDelivery.js
// (Delete this file before deploying.)
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const DeliveryPartner = require('./models/DeliveryPartner');
const Order = require('./models/Order');

(async () => {
  try {
    await connectDB();
    const email = 'delivery@demo.com';
    let p = await DeliveryPartner.findOne({ email });
    if (!p) {
      p = await DeliveryPartner.create({
        name: 'Demo Partner', email, phone: '9876543210', password: 'Delivery@123',
        vehicleType: 'Bike', vehicleNumber: 'MP04AB1234', city: 'Bhopal',
      });
      console.log('Created partner  ->  email: delivery@demo.com   password: Delivery@123');
    } else {
      console.log('Partner already exists  ->  delivery@demo.com');
    }

    // Delivery boy only gets orders the admin has CONFIRMED
    const orders = await Order.find({
      orderStatus: 'Confirmed',
      'delivery.partner': { $exists: false },
    }).limit(6);

    for (const o of orders) {
      o.delivery.partner = p._id;
      o.delivery.status = 'Assigned';
      o.delivery.assignedAt = new Date();
      o.trackingUpdates.push({ status: 'Confirmed', message: `Assigned to delivery partner ${p.name}` });
      await o.save();
    }
    console.log(`Assigned ${orders.length} order(s) to ${p.name}.` + (orders.length ? '' : ' (Admin panel me kuch orders ko Confirm karo, phir ye dobara chalao.)'));
  } catch (e) {
    console.error('Seed failed:', e.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
