# Secure Authentication System

A full-stack cybersecurity platform demonstrating authentication, authorization,
threat detection, security monitoring, and AI-assisted security analysis.

Built with **Node.js + Express + MySQL** on the backend and plain **HTML/CSS/JS**
on the frontend, with **Google Gemini** powering the AI Security Assistant,
log analyzer, and personalized recommendations.

---

## 1. What's Included

```
secure-auth-system/
├── backend/        Node.js + Express API (auth, security, AI, reports)
├── frontend/        Plain HTML/CSS/JS — login, register, dashboards, chatbot
└── database/        MySQL schema + seed data
```

Features implemented:
- Registration with email OTP verification
- Login with JWT auth, server-revocable sessions, RBAC (user/admin)
- Forgot password via OTP
- bcrypt password hashing, live + server-side password strength scoring
- Account lockout after repeated failed attempts
- Brute-force & credential-stuffing pattern detection
- New-device / new-location suspicious login detection
- Full login audit trail
- AI Security Assistant chatbot (Claude API, with graceful fallback if no key)
- AI-generated personalized security recommendations
- AI Log Analyzer (rule-based detection + AI plain-English summary)
- User dashboard: security score, login history, alerts
- Admin dashboard: users, logs, locked accounts, analytics, AI analyzer
- PDF security reports & CSV login-activity export

---

## 2. Prerequisites

- **Node.js** 18+ and npm
- **MySQL** 8+ (running locally, or accessible remotely)
- A code editor and a terminal
- (Optional) A **Gemini API key** from https://aistudio.google.com/app/apikey — the
  app runs fine without one, with AI features showing a clear fallback message
- (Optional) SMTP credentials (e.g. a Gmail App Password, or a free
  [Mailtrap](https://mailtrap.io) inbox for testing) — without these, OTP
  codes are printed to the backend console instead of emailed, so you can
  still test every flow

---

## 3. Setup — Database

1. Make sure MySQL is running locally.
2. Run the schema script to create the database and all tables:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
3. (Optional) Load sample login-log data so the admin dashboard isn't empty
   on first run:
   ```bash
   mysql -u root -p < database/seed.sql
   ```

---

## 4. Setup — Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in at minimum:

```env
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=secure_auth_system
JWT_SECRET=<generate one — see below>
```

Generate a strong `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Optional but recommended — enable real emails:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
```
(Gmail requires an [App Password](https://myaccount.google.com/apppasswords),
not your normal password, if 2FA is enabled on the account.)

**Optional but recommended — enable AI features:**
```env
GEMINI_API_KEY=...
```

Create your first admin account (there's no UI to promote a user — you need
at least one admin to access the admin dashboard):
```bash
npm run create-admin
```
This uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env` (defaults shown
in `.env.example` — change them before running in anything but a local demo).

Start the backend:
```bash
npm run dev
```
You should see:
```
[db] Connected to MySQL database "secure_auth_system" at localhost:3306
Secure Authentication System API listening on port 3000 (development)
Health check: http://localhost:3000/api/health
```

Visit `http://localhost:3000/api/health` in a browser to confirm it's running.

---

## 5. Setup — Frontend

The frontend is plain static HTML/CSS/JS — no build step required.

**Easiest option:** open `frontend/public/index.html` directly in a browser,
or serve the folder with any static file server, e.g.:
```bash
cd frontend/public
npx serve .
```
or use the VS Code "Live Server" extension.

By default, the frontend expects the backend at `http://localhost:3000/api`.
If your backend runs elsewhere, set this before the page scripts load — e.g.
add this line in the `<head>` of any HTML page, before `api.js`:
```html
<script>window.API_BASE_URL = 'https://your-backend-domain.com/api';</script>
```

Also make sure `FRONTEND_URL` in the backend's `.env` matches wherever you're
serving the frontend from (CORS is restricted to this exact origin).

---

## 6. Demo Walkthrough

1. **Register** a new account at `index.html` → check the backend console
   (or your real inbox, if SMTP is configured) for the OTP code → verify it
   on the OTP page.
2. **Log in** with the new account → lands on the **user dashboard**. Note
   the password score ring, empty login history (just this one successful
   login), and no alerts yet.
3. **Trigger a lockout**: log out, then deliberately enter the wrong
   password 5 times on the login page. The 5th attempt returns a "locked"
   message. Log back in as that user (once unlocked, or as admin) to see
   the new `account_locked` alert.
4. **Log in as admin** (the account from `npm run create-admin`) → explore
   the admin dashboard: Overview stats, Users table (try locking/unlocking
   a user), Login Logs (filter by status), Locked Accounts.
5. **Run the AI Log Analyzer**: go to Security Analytics → "Re-analyze
   logs". With a real `GEMINI_API_KEY` set, you'll get a plain-English
   summary of brute-force/credential-stuffing patterns found in the logs
   (the seed data and the lockout you triggered in step 3 are good fuel for
   this). Without a key, you'll see the raw findings with a note that AI
   summarization isn't configured.
6. **Try the AI chatbot**: click the floating chat button on either
   dashboard and ask something like "What is a brute-force attack?"
7. **Download a report**: from the user dashboard, download the PDF
   security report and the CSV login-activity export. From the admin
   analytics page, download the full org-wide PDF report.

---

## 7. Project Structure Reference

See `backend/src/` for the layered architecture:
- `controllers/` — HTTP request/response handling only
- `services/` — business logic (auth rules, security detection, AI calls)
- `models/` — raw parameterized SQL queries per table
- `middleware/` — JWT auth, RBAC, rate limiting, validation, error handling
- `routes/` — maps URLs to controllers + middleware chains
- `config/` — env loading, DB pool, mailer setup
- `utils/` — small shared helpers (hashing, JWT signing, OTP generation, logging)

See `frontend/public/`:
- `index.html`, `register.html`, `verify-otp.html`, `forgot-password.html` — auth flow
- `dashboard-user.html`, `dashboard-admin.html` — main app screens
- `assets/js/api.js` — shared fetch wrapper (attaches JWT automatically)
- `assets/js/chatbot-widget.js` — floating AI assistant, used on both dashboards

---

## 8. Security Notes (for your project report)

- Passwords and OTP codes are **bcrypt-hashed**, never stored in plaintext.
- All SQL queries use **parameterized statements** (no string concatenation) —
  see any file in `backend/src/models/`.
- Login responses are **intentionally generic** ("Invalid email or password")
  to avoid leaking whether an email is registered.
- JWTs are short-lived and paired with a server-side `sessions` table, so
  logout and session timeout actually work (a bare JWT can't be revoked early).
- The frontend stores the JWT in `localStorage` for simplicity in this
  no-build-step demo. **For production**, prefer an httpOnly, Secure,
  SameSite cookie instead — it isn't readable by JavaScript, so an XSS bug
  can't be used to steal the token. This tradeoff is worth calling out
  explicitly in a project report or interview.
- The AI layer **never makes security decisions** — brute-force and
  credential-stuffing detection are deterministic SQL queries
  (`security.service.js`). The AI only explains findings that rules already
  surfaced, which mirrors how real SIEM/security tools are architected.

---

## 9. Troubleshooting

| Problem | Likely cause |
|---|---|
| `[db] Failed to connect to MySQL` on startup | Check `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` in `.env`, and confirm `schema.sql` was run |
| OTP email never arrives | SMTP not configured — check the backend console, the OTP is logged there in dev mode |
| Frontend shows "Could not reach the server" | Backend isn't running, or `API_BASE_URL` / CORS `FRONTEND_URL` mismatch |
| AI chatbot says it's "not configured" | Add `GEMINI_API_KEY` to backend `.env` and restart the server |
| 403 on admin routes | The logged-in account's role isn't `admin` — run `npm run create-admin` |

---

## 10. Future Scope

See the full project blueprint document for a detailed list of extensions
(TOTP-based 2FA, OAuth login, refresh-token rotation, WebAuthn/passkeys,
real-time alerting via WebSockets, ML-based anomaly detection, immutable
audit logging, and more).

---

## 11. Deploying This Project

See **`DEPLOYMENT.md`** in this repo for full step-by-step instructions
covering two paths:
- **Railway + Netlify** — fastest, free-tier friendly, managed MySQL included
- **Self-managed VPS** (Ubuntu + Nginx + PM2 + Let's Encrypt) — more control, more DevOps learning value

Either way, the only frontend change needed is editing one line in
`frontend/public/assets/js/config.js` to point at your deployed backend URL.
