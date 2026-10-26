const mongoose = require('mongoose');
 
// Variable ka naam MONGODB_URI / ATLAS_URI / MONGO_URI, jo bhi .env ya hosting mein ho, chalega
const getUri = () =>
  process.env.MONGODB_URI || process.env.ATLAS_URI || process.env.MONGO_URI;
 
// Serverless (Vercel) mein connection promise ko global me cache karte hain,
// taaki warm instance par dobara connect na ho aur har request connection ready hone ka wait kare.
let cached = global._mongooseCache;
if (!cached) cached = global._mongooseCache = { promise: null };
 
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
 
  if (!cached.promise) {
    const uri = getUri();
    if (!uri) {
      throw new Error('MongoDB URL nahi mili. Hosting me MONGODB_URI / MONGO_URI daalo.');
    }
    cached.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 8000, bufferCommands: false })
      .then((m) => {
        console.log(`MongoDB Connected: ${m.connection.host}`);
        return m.connection;
      })
      .catch((err) => {
        cached.promise = null; // agle request par dobara try ho
        throw err;
      });
  }
  return cached.promise;
};
 
module.exports = connectDB;
 