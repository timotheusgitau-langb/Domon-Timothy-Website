# Timothy Domon Website

This project includes a neon-themed portfolio website plus a secure contact backend and admin dashboard.

## Features

- Responsive static website with homepage, about, services, blog, and contact pages
- Secure contact form with fields for name, email, subject, and message
- Google reCAPTCHA spam protection
- Backend message delivery to admin email
- Stored submissions in `messages.json`
- Admin dashboard at `/admin/messages` with Basic Auth protection

## Setup

1. Install dependencies:

```bash
npm install
```

2. Define environment variables:

```bash
set ADMIN_EMAIL=you@example.com
set ADMIN_USER=admin
set ADMIN_PASS=supersecret
set RECAPTCHA_SECRET=your_recaptcha_secret
set SMTP_HOST=smtp.example.com
set SMTP_PORT=587
set SMTP_USER=smtp-user
set SMTP_PASS=smtp-pass
```

3. Update `contact.html` with your Google reCAPTCHA site key:

```html
<div class="g-recaptcha" data-sitekey="YOUR_RECAPTCHA_SITE_KEY"></div>
```

4. Start the server:

```bash
npm start
```

5. Open the website:

- Main site: `http://localhost:3000`
- Admin dashboard: `http://localhost:3000/admin/messages`

## Notes

- `messages.json` is ignored by Git and stores submissions locally.
- For secure production deployment, use HTTPS and a strong admin password.
- The admin dashboard is protected with HTTP Basic Auth.
