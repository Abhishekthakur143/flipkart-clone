const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorMiddleware = require('./middleware/error');
 
// Load environment variables
dotenv.config({ path: './.env' });
 
// Local par kuch internet providers ka DNS Atlas ka "+srv" address resolve nahi karta (querySrv ECONNREFUSED).
// Sirf development mein public DNS use karte hain. Render par iski zaroorat nahi.
if (process.env.NODE_ENV !== 'production') {
  require('dns').setServers(['8.8.8.8', '1.1.1.1']);
}
 
// Cloudinary configuration
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
 
const app = express();
 
// Render/Vercel jaise hosts proxy ke peeche chalte hain (HTTPS, secure cookie ke liye zaroori)
app.set('trust proxy', 1);
 
// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(fileUpload({
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB max (Vercel ka request body limit 4.5MB hai)
  useTempFiles: true,
  tempFileDir: '/tmp/', // Vercel par sirf /tmp likhne layak hai
}));
 
// CORS Configuration (FRONTEND_URL me comma laga ke ek se zyada URL de sakte ho)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);
 
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
 
// Database: har request par connection ready hone ka wait karo (serverless ke liye zaroori).
// CORS ke baad rakha hai, taaki DB fail hone par bhi browser ko CORS headers milein.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connect failed:', err.message);
    res.status(503).json({ success: false, message: 'Database unavailable' });
  }
});
 
// Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/products', require('./routes/productRoutes'));
app.use('/api/v1/categories', require('./routes/categoryRoutes'));
app.use('/api/v1/orders', require('./routes/orderRoutes'));
app.use('/api/v1/coupons', require('./routes/couponRoutes'));
app.use('/api/otp', require('./routes/otpRoutes'));
app.use('/api/v1/payment', require('./routes/paymentRoutes'));
app.use('/api/v1/wishlist', require('./routes/wishlistRoutes'));
app.use('/api/v1/admin', require('./routes/adminRoutes'));
app.use('/api/v1/otp', require('./routes/otpRoutes'));
// Delivery partner dashboard
app.use('/api/v1/delivery', require('./routes/deliveryRoutes'));
 
// Health check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});
 
// Error middleware (must be last)
app.use(errorMiddleware);
 
// Local / Render par server start karo. Vercel (serverless) par listen nahi hota, app export hota hai.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
 
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
 
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error(`Error: ${err.message}`);
    server.close(() => process.exit(1));
  });
}
 
module.exports = app;
 