# Deploy Sanavo → https://sanavo.in

Domain: **sanavo.in**

Sanavo needs a host with a **persistent disk** (SQLite). Fastest path: **Railway**.

---

## Step 1 — Push code to GitHub

1. Create a new private repo on GitHub (e.g. `sanavo`)
2. In Terminal, from the `telehealth-app` folder:

```bash
git remote add origin https://github.com/YOUR_USERNAME/sanavo.git
git add .
git commit -m "Prepare Sanavo for production deploy"
git push -u origin main
```

(If you already have commits, just `git push -u origin main`.)

---

## Step 2 — Deploy on Railway

1. Sign up at [https://railway.app](https://railway.app) (GitHub login)
2. **New Project** → **Deploy from GitHub repo** → select `sanavo`
3. Railway should detect the **Dockerfile**
4. Open the service → **Variables** → add:

| Variable | Value |
|----------|--------|
| `JWT_SECRET` | (long random — generate below) |
| `PASSWORD_PEPPER` | (different long random) |
| `NEXT_PUBLIC_APP_URL` | `https://sanavo.in` |
| `DATABASE_URL` | `file:/app/data/sanavo.db` |
| `EMAIL_FROM` | `Sanavo <noreply@sanavo.in>` |
| `RESEND_API_KEY` | (when ready) |
| `MSG91_AUTH_KEY` | (when ready) |
| `MSG91_SENDER_ID` | `SANAVO` |
| `RAZORPAY_KEY_ID` | (test or live) |
| `RAZORPAY_KEY_SECRET` | (test or live) |

Generate secrets locally:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

5. **Settings → Volumes** → add volume mount path: `/app/data`
6. Wait for deploy to succeed → open the Railway `.up.railway.app` URL to confirm the site loads

---

## Step 3 — Point sanavo.in DNS to Railway

1. In Railway → your service → **Settings → Networking / Domains**
2. Click **Custom Domain** → enter `sanavo.in` (and optionally `www.sanavo.in`)
3. Railway shows the DNS records you must add

4. Log into wherever you bought **sanavo.in** (GoDaddy / Namecheap / Hostinger / Google / etc.)
5. Open **DNS** / **Manage DNS** and set what Railway asks for. Typically:

| Type | Host | Value |
|------|------|--------|
| CNAME or A/ALIAS | `@` or `sanavo.in` | (from Railway) |
| CNAME | `www` | (from Railway) |

DNS can take **5 minutes to a few hours**.

6. When Railway shows the domain as **Active**, open https://sanavo.in

---

## Step 4 — First login (secure it)

1. Go to https://sanavo.in/login
2. Admin: `admin@sanavo.in` / `Admin@123`
3. **Change the password immediately**

---

## Optional next

- Add Resend + verify domain `sanavo.in` for real email / PDF delivery  
- Add MSG91 for SMS  
- Switch Razorpay to **live** keys when ready for real payments  

---

## If you bought hosting with the domain (Hostinger VPS etc.)

Tell me the provider + whether you have a **VPS** (not just “shared hosting”). We can use Docker on that server instead of Railway.
