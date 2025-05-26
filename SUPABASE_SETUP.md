# Supabase Setup Guide for PadelParrot

## 🎯 Overview

This guide will help you set up Supabase as the backend for PadelParrot. Once completed, you'll have:
- Real user authentication with phone/SMS
- A PostgreSQL database with all tables and security policies
- Real-time match updates

## 📝 Step 1: Create Supabase Project

1. **Go to [supabase.com](https://supabase.com)** and sign up/sign in
2. **Click "New Project"**
3. **Fill in the details:**
   - Organization: Create new or use existing
   - Project name: `padel-parrot`
   - Database password: Choose a strong password (save this!)
   - Region: Choose closest to your users
4. **Click "Create new project"**
5. **Wait for setup** (takes 1-2 minutes)

## 🗄️ Step 2: Set Up Database Schema

1. **Go to the SQL Editor** in your Supabase dashboard
2. **Copy the entire contents** of `supabase/schema.sql` from your project
3. **Paste it into the SQL Editor**
4. **Click "Run"** to execute the schema

This will create:
- ✅ Users, matches, and participants tables
- ✅ Security policies (Row Level Security)
- ✅ Helper functions for match management
- ✅ Sample data for testing

## 🔑 Step 3: Configure Phone Authentication

1. **Go to Authentication > Settings** in Supabase
2. **Scroll to "Phone Auth"**
3. **Enable phone authentication**
4. **Choose your SMS provider:**

### Option A: Twilio (Recommended)
1. **Sign up at [twilio.com](https://twilio.com)**
2. **Get your credentials:**
   - Account SID
   - Auth Token
   - Phone Number (buy one for $1/month)
3. **In Supabase, enter your Twilio credentials**

### Option B: Use Supabase's built-in SMS (Easier setup)
1. **Just enable it** - Supabase handles everything
2. **Note: Limited free tier, then $0.05 per SMS**

## 🔧 Step 4: Get Your Project Keys

1. **Go to Settings > API** in Supabase
2. **Copy these values:**
   - **Project URL** (looks like `https://abcdefg.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)

## 🌍 Step 5: Update Environment Variables

Create a `.env.local` file in your project root:

```bash
# Copy this to .env.local and update with your values

# Environment
NODE_ENV=development

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=PadelParrot

# Feature Flags
NEXT_PUBLIC_ENABLE_SMS_REMINDERS=true
NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=false
```

**Replace:**
- `YOUR-PROJECT` with your actual project reference
- `YOUR-ANON-KEY` with your actual anon key

## 🚀 Step 6: Test the Connection

1. **Restart your development server:**
   ```bash
   npm run dev
   ```

2. **Test authentication:**
   - Go to `http://localhost:3000`
   - Enter a real phone number
   - You should receive an SMS with verification code
   - Enter the code to sign in

3. **Test match creation:**
   - Create a new match
   - It should save to your Supabase database
   - Check the "matches" table in Supabase to confirm

## 🔍 Step 7: Verify Everything Works

### Check Database Tables
In Supabase dashboard > Table Editor, you should see:
- ✅ `users` - User profiles
- ✅ `matches` - Match data
- ✅ `participants` - Match participants

### Check Authentication
In Supabase dashboard > Authentication > Users:
- ✅ You should see your user after signing in

### Check Real-time Updates
- ✅ Create a match on one device/browser
- ✅ Open the app on another device/browser
- ✅ The new match should appear immediately

## 🎉 Success!

If everything above works, you now have:
- ✅ Real phone authentication
- ✅ Real database with proper security
- ✅ Real-time match updates
- ✅ Full WhatsApp sharing functionality

## 🚧 Next Steps

With Supabase working, you can now:
1. **Deploy to production** (Vercel recommended)
2. **Set up SMS reminders** with scheduled functions
3. **Add push notifications** for mobile
4. **Build the mobile app** with Expo

## 💡 Tips

- **Free tier limits:** 50,000 monthly active users, 500MB database
- **Monitoring:** Check Supabase dashboard for usage and errors
- **Scaling:** Upgrade plan when you need more capacity
- **Security:** Review RLS policies before going live

## 🆘 Troubleshooting

### "Invalid API key" error
- Double-check your environment variables
- Make sure there are no trailing spaces
- Restart the development server

### SMS not sending
- Verify your phone number format (+1234567890)
- Check Twilio credentials if using Twilio
- Check Supabase logs for errors

### Database connection issues
- Verify your project URL is correct
- Check if your project is paused (free tier auto-pauses)
- Look for errors in browser console

---

**Need help?** Check the [Supabase documentation](https://supabase.com/docs) or reach out! 