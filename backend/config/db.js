
const mongoose = require('mongoose');
 
// Variable ka naam MONGODB_URI / ATLAS_URI / MONGO_URI, jo bhi .env ya hosting mein ho, chalega
const getUri = () =>
  process.env.MONGODB_URI || process.env.ATLAS_URI || process.env.MONGO_URI;
 
const connectDB = async () => {
  // Serverless (Vercel) mein warm instance par connection dobara nahi banate
  if (mongoose.connection.readyState === 1) return;
 
  try {
    const uri = getUri();
    if (!uri) {
      throw new Error('MongoDB URL nahi mili. .env / hosting mein MONGODB_URI daalo.');
    }
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    // Vercel par process exit nahi karte, warna function crash ho jata hai
    if (!process.env.VERCEL) process.exit(1);
  }
};
 
module.exports = connectDB;
 