const ErrorHandler = require('../utils/errorHandler');

module.exports = (err, req, res, next) => {
  console.log("===== BACKEND ERROR =====", err);

  err.statusCode = err.statusCode || 500;
  // ... baaki code waisa hi rahega
  
  // Default values set kar dein (Agar undefined aaye toh 500 aayega)
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // MongoDB wrong ObjectId error
  if (err.name === 'CastError') {
    message = `Resource not found. Invalid: ${err.path}`;
    statusCode = 400;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    message = `Duplicate ${Object.keys(err.keyValue)} entered`;
    statusCode = 400;
  }

  // JWT wrong token error
  if (err.name === 'JsonWebTokenError') {
    message = 'JSON Web Token is invalid. Try again.';
    statusCode = 400;
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    message = 'JSON Web Token is expired. Try again.';
    statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    statusCode = 400;
  }

  // Final response bhejna
  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};