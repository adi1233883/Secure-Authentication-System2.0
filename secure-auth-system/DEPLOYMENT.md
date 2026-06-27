# Deployment Guide

This covers two paths: **Railway** (fastest, managed MySQL included, good for
a demo/portfolio deploy) and a **self-managed VPS** (more control, more
DevOps learning value — closer to a real production setup).

Before either path, one frontend change applies to both:

## Frontend config (do this regardless of hosting choice)

Open `frontend/public/assets/js/config.js` and change the single line:
```js
window.API_BASE_URL = 'http://localhost:3000/api';
```
to your deployed backend's URL, e.g.:
```js
window.API_BASE_URL = 'https://secure-auth-backend.up.railway.app/api';
```
This is the **only** file you need to edit to point the entire frontend at a
different backend — every page loads it before `api.js`.

---

## Option A — Railway (backend + MySQL) + Netlify (frontend)

### 1. Push to GitHub
```bash
cd secure-auth-system
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/secure-auth-system.git
git branch -M main && git push -u origin main
```

### 2. Create the Railway project
- [railway.app](https://railway.app) → New Project → Deploy from GitHub repo → select your repo.
- Service Settings → **Root Directory** → set to `backend` (your Express app lives there, not at the repo root).

### 3. Add a MySQL database
- Same project → **New** → **Database** → **Add MySQL**.
- Railway exposes `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` automatically.

### 4. Set environment variables on the backend service
Variables tab → add (Railway autocompletes `${{MySQL.X}}` references):
```
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
JWT_SECRET=<generate locally, see below>
JWT_EXPIRES_IN=30m
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
SESSION_DURATION_MINUTES=30
OTP_EXPIRY_MINUTES=10
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.netlify.app
GEMINI_API_KEY=...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM_NAME=Secure Auth System
SMTP_FROM_EMAIL=no-reply@secureauth.com
ADMIN_FULL_NAME=System Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<a real strong password>
```

Generate `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 5. Run the schema against Railway's MySQL
Get external connection details from the MySQL service's **Connect** tab, then from your local machine:
```bash
mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p<MYSQLPASSWORD> <MYSQLDATABASE> < database/schema.sql
mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p<MYSQLPASSWORD> <MYSQLDATABASE> < database/seed.sql
```

### 6. Deploy + create the admin account
Railway auto-deploys on push. Once live, open a shell on the service (or use the Railway CLI):
```bash
railway run npm run create-admin
```

### 7. Generate a public backend domain
Backend service → Settings → Networking → **Generate Domain**. Test it:
```bash
curl https://your-backend.up.railway.app/api/health
```

### 8. Deploy the frontend on Netlify
- [netlify.com](https://netlify.com) → Add new site → Import from Git.
- Base directory: `frontend/public`. Publish directory: `frontend/public`. No build command.
- Deploy → you get a URL like `https://secure-auth-demo.netlify.app`.

### 9. Wire the two together
- Edit `frontend/public/assets/js/config.js` with the real backend URL (step above), commit, push — Netlify redeploys automatically.
- Update `FRONTEND_URL` in Railway's backend variables to your real Netlify URL, so CORS allows it.

Done — visit your Netlify URL and the full app should work end-to-end.

---

## Option B — Self-managed VPS (Ubuntu)

Use this if you want full control or need to demonstrate DevOps skills.

### 1. Provision a VPS
Any Ubuntu 22.04/24.04 droplet/instance (DigitalOcean, Lightsail, Oracle Free Tier, etc). SSH in:
```bash
ssh root@your-server-ip
```

### 2. Install dependencies
```bash
apt update && apt upgrade -y
apt install -y nginx mysql-server git

# Node via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install --lts

npm install -g pm2
```

### 3. Secure MySQL and create the database
```bash
mysql_secure_installation
mysql -u root -p < /path/to/secure-auth-system/database/schema.sql
mysql -u root -p < /path/to/secure-auth-system/database/seed.sql
```
In `/etc/mysql/mysql.conf.d/mysqld.cnf`, confirm `bind-address = 127.0.0.1` (local-only access — the app connects via localhost, never expose 3306 publicly).

### 4. Clone and configure the backend
```bash
git clone https://github.com/yourusername/secure-auth-system.git
cd secure-auth-system/backend
npm install --production
cp .env.example .env
nano .env   # fill in DB_PASSWORD, JWT_SECRET, SMTP_*, GEMINI_API_KEY, etc.
npm run create-admin
```

### 5. Run with PM2 (auto-restart on crash/reboot)
```bash
pm2 start server.js --name secure-auth-backend
pm2 save
pm2 startup   # follow the printed instructions to enable on boot
```

### 6. Configure Nginx as a reverse proxy
Create `/etc/nginx/sites-available/secure-auth`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        root /path/to/secure-auth-system/frontend/public;
        try_files $uri $uri.html $uri/ =404;
    }
}
```
Enable it:
```bash
ln -s /etc/nginx/sites-available/secure-auth /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```
With this setup, frontend and backend share the same domain, so set:
```js
// config.js
window.API_BASE_URL = 'https://yourdomain.com/api';
```
and in the backend `.env`:
```
FRONTEND_URL=https://yourdomain.com
```

### 7. Free HTTPS with Let's Encrypt
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```
Certbot edits your Nginx config to redirect HTTP → HTTPS and auto-renews the certificate.

### 8. Firewall
```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```
Port 3000 (the app) and 3306 (MySQL) should **not** be open to the public — Nginx proxies to 3000 internally, and MySQL only needs localhost access.

### 9. Verify
```bash
curl https://yourdomain.com/api/health
```
Then visit `https://yourdomain.com` in a browser.

---

## Post-deploy checklist (either option)

- [ ] `NODE_ENV=production` set on the backend
- [ ] `JWT_SECRET` is a real random value, not a placeholder
- [ ] `FRONTEND_URL` matches your actual deployed frontend origin exactly (CORS will reject mismatches)
- [ ] `ADMIN_PASSWORD` changed from any default before/after running `create-admin`
- [ ] HTTPS is active (Railway/Netlify give this for free automatically; VPS needs Certbot — step 7 above)
- [ ] Gemini API key has a spend/quota limit set in [Google AI Studio](https://aistudio.google.com/app/apikey) to avoid surprise bills
- [ ] Test the full flow live: register → OTP → login → trigger a lockout → admin dashboard → AI chatbot → PDF report download
