# 🚀 Supabase Quick Start (New Project)

## ⚡ 5-Minute Setup

### 1. Create Project (2 min)
- Go to [supabase.com](https://supabase.com) → New Project
- Name: `padel-parrot`
- Save your database password!
- Wait for setup to complete

### 2. Run Database Setup (1 min)
- Go to **SQL Editor** in Supabase
- Open `supabase/complete-setup.sql` from your project
- Copy **entire file** → Paste → **Run**

### 3. Get Credentials (30 sec)
- Go to **Settings → API**
- Copy:
  - Project URL
  - anon public key

### 4. Update Environment Variables (1 min)

**Local** (`.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

**Vercel Production**:
- Go to [vercel.com/dashboard](https://vercel.com/dashboard)
- Your project → Settings → Environment Variables
- Update the same two variables
- **Redeploy** your app

### 5. Enable Phone Auth (30 sec)
- Supabase → **Authentication → Settings**
- Enable **Phone Auth**
- (Optional) Add Twilio credentials for production

### 6. Test (30 sec)
- Restart dev server: `npm run dev`
- Visit `http://localhost:3000`
- Try signing in with your phone number

---

## ✅ Verification

Check these in Supabase dashboard:
- [ ] **Table Editor** → See `users`, `matches`, `participants` tables
- [ ] **Authentication → Settings** → Phone auth enabled
- [ ] **SQL Editor** → No errors from setup script

---

## 📚 Full Guide

See `SUPABASE_NEW_PROJECT_SETUP.md` for detailed instructions and troubleshooting.

---

## 🆘 Quick Fixes

**"Invalid API key"** → Check environment variables, restart dev server

**SMS not sending** → Verify phone format: `+1234567890` (with country code)

**Tables missing** → Re-run `supabase/complete-setup.sql`

**Production not working** → Update Vercel env vars and redeploy

