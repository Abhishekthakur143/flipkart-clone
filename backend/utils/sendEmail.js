const nodemailer = require('nodemailer');

// ---------- Gmail API (HTTPS) ----------
let cachedToken = null;
let cachedExpiry = 0;

const getAccessToken = async () => {
  if (cachedToken && Date.now() < cachedExpiry - 60 * 1000) return cachedToken;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Gmail token error: ${data.error || res.status} ${data.error_description || ''}`);
  }

  cachedToken = data.access_token;
  cachedExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
};

const encodeHeader = (text) =>
  `=?UTF-8?B?${Buffer.from(String(text), 'utf8').toString('base64')}?=`;

const sendViaGmailApi = async (options) => {
  const accessToken = await getAccessToken();
  const fromName = process.env.FROM_NAME || 'Flipkart Clone';
  const fromEmail = process.env.GMAIL_USER;

  const raw = [
    `From: ${encodeHeader(fromName)} <${fromEmail}>`,
    `To: ${options.email}`,
    `Subject: ${encodeHeader(options.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(options.html || options.message || '', 'utf8').toString('base64'),
  ].join('\r\n');

  const encoded = Buffer.from(raw, 'utf8').toString('base64url');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Gmail send error ${res.status}: ${data.error?.message || 'unknown'}`);
  }
  return data;
};

// ---------- SMTP (local fallback) ----------
const sendViaSmtp = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.html || options.message,
  };

  return transporter.sendMail(message);
};

const sendEmail = async (options) => {
  if (process.env.GMAIL_REFRESH_TOKEN) {
    return sendViaGmailApi(options);
  }
  return sendViaSmtp(options);
};

module.exports = sendEmail;