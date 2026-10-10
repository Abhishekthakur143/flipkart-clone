// Sends the OTP to the email the user typed, using YOUR existing sendEmail util.
// Needs in backend/.env: SMTP_HOST, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD, FROM_NAME, FROM_EMAIL
const sendEmail = require('./sendEmail');   // ADAPT: path/name of YOUR existing sendEmail file
 
module.exports = async function sendOtpEmail(to, otp, purpose) {
  const smtpReady = process.env.SMTP_HOST && process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD;
 
  // OTP is NEVER printed unless you explicitly set OTP_DEBUG=true (local testing only, never in production)
  if (process.env.NODE_ENV !== 'production' && process.env.OTP_DEBUG === 'true') {
    console.log(`\n[DEV OTP] ${purpose} OTP for ${to}: ${otp}\n`);
    if (!smtpReady) return { dev: true };
  }
  if (!smtpReady) throw new Error('SMTP is not configured: OTP can only be emailed to the account owner');
 
  const title = purpose === 'reset' ? 'Reset your password' : 'Your login code';
  await sendEmail({
    email: to,
    subject: `${otp} is your OTP`,
    html: `<div style="font-family:Arial,sans-serif;max-width:420px">
      <h2 style="color:#2874f0;margin:0 0 8px">${title}</h2>
      <p>Your OTP is</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:bold;margin:8px 0">${otp}</p>
      <p style="color:#666">Valid for 5 minutes. Do not share it with anyone.</p></div>`,
  });
  return { dev: false };
};