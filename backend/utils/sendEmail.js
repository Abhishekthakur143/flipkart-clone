const nodemailer = require('nodemailer');
 
// SMTP se email (Gmail App Password ya koi bhi SMTP provider).
// Google Console / OAuth / refresh token ki zaroorat nahi.
//
// Env variables:
//   SMTP_HOST      = smtp.gmail.com
//   SMTP_PORT      = 465   (Vercel par 465 aur 587 khule hain, 25 band hai)
//   SMTP_EMAIL     = aapka gmail
//   SMTP_PASSWORD  = Gmail ka 16 akshar wala App Password (normal password nahi)
//   FROM_NAME      = Flipkart Clone
//   FROM_EMAIL     = SMTP_EMAIL wala hi email (Gmail ke liye same hona chahiye)
 
const sendEmail = async (options) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    throw new Error('SMTP set nahi hai: SMTP_HOST, SMTP_EMAIL, SMTP_PASSWORD daalo');
  }
 
  const port = Number(process.env.SMTP_PORT) || 465;
 
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: String(process.env.SMTP_PASSWORD).replace(/\s/g, ''), // App Password ke beech ke space hata deta hai
    },
    // Serverless mein atak na jaye, isliye timeouts
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
 
  // await zaroori hai: Vercel par response jaane ke baad function ruk jata hai
  return await transporter.sendMail({
    from: `${process.env.FROM_NAME || 'Flipkart Clone'} <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.html || options.message,
  });
};
 
module.exports = sendEmail;