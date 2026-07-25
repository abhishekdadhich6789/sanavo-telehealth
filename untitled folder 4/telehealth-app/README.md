# Sanavo

Online medical certificates and telehealth consultations for India.

## Features

- Medical certificates (work, school/university, carer's leave) — max 2 days
- Telehealth consultations with NMC-registered doctors
- Doctor portal + admin panel
- Razorpay payments (UPI, cards, netbanking, wallets)
- SQLite + Prisma backend

## Quick start (local)

```bash
npm install
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000

**Default admin:** `admin@sanavo.in` / `Admin@123`

---

## Razorpay setup (required for real payments)

### 1. Create a Razorpay account

1. Go to [https://razorpay.com](https://razorpay.com) and sign up
2. Complete business KYC (needed for **Live** mode / real money)
3. Open [Dashboard → Account & Settings → API Keys](https://dashboard.razorpay.com/app/keys)

### 2. Get API keys

**For testing (no real money):**
1. Keep **Test Mode** ON (toggle at top of dashboard)
2. Click **Generate Test Key**
3. Copy **Key Id** (`rzp_test_...`) and **Key Secret**

**For launch (real money):**
1. Switch to **Live Mode**
2. Click **Generate Live Key**
3. Copy **Key Id** (`rzp_live_...`) and **Key Secret**
4. Store the secret safely — it is shown only once

### 3. Add keys to your app

Edit `.env.local` (local) or your host’s Environment Variables (production):

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET=pick-a-long-random-secret

# Test keys first
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx

# For production launch, replace with live keys:
# RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
# RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
```

Restart the server after changing env:

```bash
npm run dev
```

### 4. Test a payment

1. Open http://localhost:3000/medical-certificate
2. Complete the form → click **Pay ₹250 & Submit**
3. Razorpay checkout should open
4. Use test card:

| Field | Value |
|-------|--------|
| Card | `4111 1111 1111 1111` |
| Expiry | Any future date |
| CVV | Any 3 digits |
| OTP | `1234` (if asked) |

Or UPI test: `success@razorpay`

5. After success you should land on the status page with payment marked **Paid**

### 5. Go live checklist

- [ ] KYC approved in Razorpay
- [ ] Live API keys set on your host (`rzp_live_...`)
- [ ] `JWT_SECRET` changed from the default
- [ ] Admin password changed
- [ ] `NODE_ENV=production` on the host (demo payments are disabled in production)
- [ ] Test one real ₹1–₹250 payment end-to-end
- [ ] Confirm money appears in Razorpay Dashboard → Transactions

### Important notes

- **Key Id** is public (sent to the browser). **Key Secret** must stay only in server env — never commit it to Git.
- Without keys in development, the app uses a **demo confirm dialog** (no real charge).
- In **production**, missing keys will block payments (no demo fallback).
- Payments supported via Razorpay: UPI, debit/credit cards, netbanking, wallets.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Migrate DB + production build |
| `npm run start` | Run production build |
| `npm run db:studio` | Browse database |

## Messaging (SMS + Email)

When a doctor approves a certificate or confirms a telehealth slot, the patient is notified automatically.

### Email (pick one)

**Resend**
```env
RESEND_API_KEY=re_xxxx
EMAIL_FROM="Sanavo <onboarding@resend.dev>"
```

**Or Gmail SMTP**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="Sanavo <your@gmail.com>"
```

### SMS (pick one)

**MSG91 (India)**
```env
MSG91_AUTH_KEY=xxxx
MSG91_SENDER_ID=SANAVO
```

**Or Twilio**
```env
TWILIO_ACCOUNT_SID=xxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_FROM_NUMBER=+91xxxxxxxxxx
```

Without keys, messages are still saved and printed in the server console (dev).

### Doctor actions that send messages

| Action | What patient receives |
|--------|------------------------|
| Approve certificate | SMS summary + full certificate by email |
| Confirm telehealth slot | SMS + email with date/time and doctor name |
| Decline | SMS + email with reason |
| Mark consult complete | SMS + email confirmation |

