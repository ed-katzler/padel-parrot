# 🆕 New Supabase Project Setup Guide

Since your previous Supabase project was paused for over 90 days, you need to set up a new one. This guide will walk you through the complete setup process.

## 📋 Quick Checklist

- [ ] Create new Supabase project
- [ ] Apply database schema
- [ ] Apply all migrations
- [ ] Configure phone authentication
- [ ] Update local environment variables
- [ ] Update Vercel production environment variables
- [ ] Test authentication
- [ ] Test match creation

---

## 🚀 Step 1: Create New Supabase Project

1. **Go to [supabase.com](https://supabase.com)** and sign in
2. **Click "New Project"**
3. **Fill in the details:**
   - **Organization**: Select your organization (or create new)
   - **Project name**: `padel-parrot` (or `padel-parrot-v2`)
   - **Database password**: Choose a strong password (⚠️ **SAVE THIS!** You'll need it)
   - **Region**: Choose closest to your users (e.g., `West US`, `East US`, `EU West`)
4. **Click "Create new project"**
5. **Wait 1-2 minutes** for the project to initialize

---

## 🗄️ Step 2: Set Up Database Schema

1. **Go to SQL Editor** in your Supabase dashboard (left sidebar)
2. **Click "New query"**
3. **Copy the entire contents** of `supabase/schema.sql` from your project
4. **Paste into the SQL Editor**
5. **Click "Run"** (or press `Cmd/Ctrl + Enter`)

This creates:
- ✅ `users` table
- ✅ `matches` table  
- ✅ `participants` table
- ✅ All indexes and triggers
- ✅ Row Level Security (RLS) policies
- ✅ Helper functions

**Expected result**: You should see "Success. No rows returned" or similar success message.

---

## 🔄 Step 3: Apply Database Migrations

Apply migrations in order:

### Migration 001: Add duration_minutes field
1. **Open** `supabase/migrations/001_add_duration_field.sql`
2. **Copy** the SQL (skip the comments at the top)
3. **Paste** into SQL Editor
4. **Run** the query

### Migration 002: Sync current players
1. **Open** `supabase/migrations/002_sync_current_players.sql`
2. **Copy** the SQL
3. **Paste** into SQL Editor
4. **Run** the query

### Migration 003: Fix current data
1. **Open** `supabase/migrations/003_fix_current_data.sql`
2. **Copy** the SQL
3. **Paste** into SQL Editor
4. **Run** the query

### Migration 004: Fix past match sync
1. **Open** `supabase/migrations/004_fix_past_match_sync.sql`
2. **Copy** the SQL
3. **Paste** into SQL Editor
4. **Run** the query

**Note**: If you see errors about functions/tables already existing, that's okay - the migrations are idempotent.

---

## 🔑 Step 4: Get Your Project Credentials

1. **Go to Settings → API** in Supabase dashboard
2. **Copy these values** (you'll need them next):

   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep this secret!)

---

## 📱 Step 5: Configure Phone Authentication

1. **Go to Authentication → Settings** in Supabase dashboard
2. **Scroll to "Phone Auth"** section
3. **Enable phone authentication** (toggle it on)

### Option A: Use Supabase's Built-in SMS (Easiest)
- Just enable it - Supabase handles everything
- **Free tier**: Limited SMS credits
- **Paid**: $0.05 per SMS after free tier

### Option B: Use Twilio (Recommended for Production)
1. **Sign up at [twilio.com](https://twilio.com)** if you don't have an account
2. **Get your credentials:**
   - Account SID
   - Auth Token
   - Phone Number (buy one for ~$1/month)
3. **In Supabase**, go to **Authentication → Settings → Phone Auth**
4. **Enter your Twilio credentials**

---

## 🌍 Step 6: Update Local Environment Variables

1. **Create/update** `.env.local` in your project root:

```bash
# Environment
NODE_ENV=development

# Supabase Configuration (NEW PROJECT)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-NEW-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-NEW-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR-NEW-SERVICE-ROLE-KEY

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=PadelParrot

# Feature Flags
NEXT_PUBLIC_ENABLE_SMS_REMINDERS=false
NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=false
```

2. **Replace**:
   - `YOUR-NEW-PROJECT-ID` with your actual project reference
   - `YOUR-NEW-ANON-KEY` with your actual anon key
   - `YOUR-NEW-SERVICE-ROLE-KEY` with your actual service role key

3. **Restart your dev server**:
   ```bash
   npm run dev
   ```

---

## ☁️ Step 7: Update Vercel Production Environment Variables

**⚠️ IMPORTANT**: Your production app needs the new Supabase credentials!

1. **Go to [vercel.com/dashboard](https://vercel.com/dashboard)**
2. **Select your `padel-parrot` project**
3. **Go to Settings → Environment Variables**
4. **Update these variables**:

   - `NEXT_PUBLIC_SUPABASE_URL` → Your new project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Your new anon key

5. **Make sure they're applied to**:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

6. **Redeploy** your production app:
   - Go to **Deployments** tab
   - Click the **three dots** (⋯) on latest deployment
   - Click **Redeploy**

---

## 🔐 Step 8: Update Supabase Authentication URLs

1. **Go to Authentication → URL Configuration** in Supabase dashboard
2. **Add your production URL** to allowed redirect URLs:
   - `https://app.padelparrot.com`
   - `https://app.padelparrot.com/**` (for all routes)
3. **Add localhost** for development:
   - `http://localhost:3000`
   - `http://localhost:3000/**`

---

## ✅ Step 9: Verify Everything Works

### Test Locally

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Visit** `http://localhost:3000`

3. **Test authentication**:
   - Enter a real phone number
   - You should receive an SMS with verification code
   - Enter the code to sign in

4. **Test match creation**:
   - Create a new match
   - Check Supabase dashboard → Table Editor → `matches` table
   - You should see your new match

### Test Production

1. **Visit** `https://app.padelparrot.com`
2. **Test authentication** (same as above)
3. **Test match creation**
4. **Check** that matches appear in Supabase

---

## 🔍 Verification Checklist

- [ ] Database tables exist (`users`, `matches`, `participants`)
- [ ] RLS policies are enabled
- [ ] Phone authentication works
- [ ] Can create matches locally
- [ ] Can create matches in production
- [ ] Matches appear in Supabase database
- [ ] Vercel environment variables updated
- [ ] Production app redeployed

---

## 🆘 Troubleshooting

### "Invalid API key" error
- ✅ Double-check environment variables (no trailing spaces)
- ✅ Restart dev server after updating `.env.local`
- ✅ Verify Vercel environment variables are updated

### SMS not sending
- ✅ Verify phone number format: `+1234567890` (with country code)
- ✅ Check Supabase logs: **Logs → API Logs**
- ✅ Verify phone authentication is enabled in Supabase

### Database connection issues
- ✅ Verify project URL is correct
- ✅ Check if project is paused (shouldn't be for new project)
- ✅ Check browser console for errors

### "Table doesn't exist" errors
- ✅ Verify schema.sql was run successfully
- ✅ Check Table Editor in Supabase dashboard
- ✅ Re-run schema.sql if needed

### Production not working
- ✅ Verify Vercel environment variables are updated
- ✅ Redeploy after updating environment variables
- ✅ Check Vercel deployment logs for errors

---

## 📝 Next Steps

Once everything is working:

1. **Test all features**:
   - Authentication
   - Match creation
   - Match joining/leaving
   - Match editing
   - WhatsApp sharing

2. **Monitor usage**:
   - Check Supabase dashboard for usage stats
   - Monitor Vercel for deployment status

3. **Set up backups** (optional):
   - Supabase automatically backs up, but you can export data manually

---

## 💡 Tips

- **Keep your database password safe** - you'll need it for direct database access
- **Service role key is powerful** - never commit it to git or expose it publicly
- **Monitor your Supabase usage** - free tier has limits
- **Test thoroughly** before going live with real users

---

**Need help?** Check the [Supabase documentation](https://supabase.com/docs) or review the original `SUPABASE_SETUP.md` file.

