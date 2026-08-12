const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'timotheusgitau@gmail.com';
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || 'YOUR_RECAPTCHA_SECRET';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password';
const STORAGE_FILE = path.join(__dirname, 'messages.json');

app.use(express.static(path.join(__dirname)));
app.use(bodyParser.json());

function requireAdminAuth(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Timothy Domon Admin"');
    return res.status(401).send('Authentication required.');
  }

  const base64Credentials = authorization.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Timothy Domon Admin"');
    return res.status(401).send('Invalid credentials.');
  }

  next();
}

function saveMessage(data) {
  let existing = [];
  if (fs.existsSync(STORAGE_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8')) || [];
    } catch (err) {
      existing = [];
    }
  }
  existing.unshift(data);
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(existing, null, 2), 'utf-8');
}

async function verifyRecaptcha(token, remoteIp) {
  if (!RECAPTCHA_SECRET || RECAPTCHA_SECRET === 'YOUR_RECAPTCHA_SECRET') {
    // If no secret provided, skip verification in development (but recommend enabling it).
    return { success: true };
  }

  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${encodeURIComponent(
    RECAPTCHA_SECRET
  )}&response=${encodeURIComponent(token)}&remoteip=${encodeURIComponent(remoteIp)}`;

  const response = await fetch(url, { method: 'POST' });
  return response.json();
}

function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message, 'g-recaptcha-response': recaptchaResponse } = req.body || {};
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ ok: false, error: 'Please provide name, email, subject and message.' });
  }

  if (!recaptchaResponse) {
    return res.status(400).json({ ok: false, error: 'CAPTCHA response is required.' });
  }

  try {
    const verification = await verifyRecaptcha(recaptchaResponse, req.ip);
    // Accept if success is true AND (no score provided OR score >= 0.5)
    const scoreOk = verification && (typeof verification.score === 'undefined' || verification.score >= 0.5);
    if (!verification || !verification.success || !scoreOk) {
      return res.status(400).json({ ok: false, error: 'CAPTCHA verification failed.' });
    }
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return res.status(500).json({ ok: false, error: 'Unable to validate CAPTCHA.' });
  }

  const timestamp = new Date().toISOString();
  const messageData = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    email,
    subject,
    message,
    timestamp,
    ip: req.ip,
    read: false,
  };

  // Save message locally for admin UI even if email fails
  try {
    saveMessage(messageData);
  } catch (err) {
    console.error('Failed to save message locally:', err);
  }

  // Build transporter using environment SMTP credentials
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true' || false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || `Website Contact <${process.env.SMTP_USER || 'no-reply@example.com'}>`,
    to: ADMIN_EMAIL,
    subject: `Website message: ${subject}`,
    text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage:\n${message}\n\nReceived: ${timestamp}`,
    html: `
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p><strong>Message:</strong><br/>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>
      <p><small>Received: ${timestamp} • IP: ${req.ip}</small></p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ ok: true, message: 'Message received — the admin will contact you shortly.' });
  } catch (error) {
    console.error('Failed to send email:', error);
    // Email failed but message is saved locally; return success response that informs admin will review
    return res.status(502).json({ ok: false, error: 'Failed to send email to admin; message was saved and will be reviewed.' });
  }
});

app.get('/admin/messages', requireAdminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/api/messages', requireAdminAuth, (req, res) => {
  let existing = [];
  if (fs.existsSync(STORAGE_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8')) || [];
    } catch (err) {
      existing = [];
    }
  }
  res.json(existing);
});

app.delete('/api/messages/:id', requireAdminAuth, (req, res) => {
  const id = req.params.id;
  let existing = [];
  if (fs.existsSync(STORAGE_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8')) || [];
    } catch (err) {
      existing = [];
    }
  }
  const filtered = existing.filter((message) => message.id !== id);
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  res.json({ success: true });
});

app.delete('/api/messages', requireAdminAuth, (req, res) => {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify([], null, 2), 'utf-8');
  res.json({ success: true });
});

app.post('/api/messages/mark-all-read', requireAdminAuth, (req, res) => {
  let existing = [];
  if (fs.existsSync(STORAGE_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8')) || [];
    } catch (err) {
      existing = [];
    }
  }
  const updated = existing.map((message) => ({ ...message, read: true }));
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
