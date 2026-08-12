const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'contact@timothydomon.com';
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
  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${encodeURIComponent(RECAPTCHA_SECRET)}&response=${encodeURIComponent(token)}&remoteip=${encodeURIComponent(remoteIp)}`;
  const response = await fetch(url, { method: 'POST' });
  return response.json();
}

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message, 'g-recaptcha-response': recaptchaResponse } = req.body;
  if (!name || !email || !subject || !message || !recaptchaResponse) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const verification = await verifyRecaptcha(recaptchaResponse, req.ip);
    if (!verification.success || verification.score < 0.5) {
      return res.status(400).json({ error: 'CAPTCHA verification failed.' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Unable to validate CAPTCHA.' });
  }

  const timestamp = new Date().toISOString();
  const messageData = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name, email, subject, message, timestamp, ip: req.ip, read: false };
  saveMessage(messageData);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'smtp-user',
      pass: process.env.SMTP_PASS || 'smtp-pass',
    },
  });

  const mailOptions = {
    from: `Timothy Domon <${process.env.SMTP_USER}>`,
    to: ADMIN_EMAIL,
    subject: `Website message: ${subject}`,
    text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage:\n${message}\n\nReceived: ${timestamp}`,
    html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Subject:</strong> ${subject}</p><p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p><p><strong>Received:</strong> ${timestamp}</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send email.' });
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
