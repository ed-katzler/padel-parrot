# 🔧 Fix "Database error saving user" Login Error

## The Problem

When trying to log in, you see the error: **"Database error saving user"**

This happens because:
1. The `users` table exists but doesn't have an INSERT policy
2. Row Level Security (RLS) is blocking the user creation
3. The app tries to create a user record after authentication, but RLS prevents it

## ✅ Quick Fix (2 minutes)

### Step 1: Run the Fix SQL

1. **Go to your Supabase Dashboard**
2. **Open SQL Editor** (left sidebar)
3. **Click "New query"**
4. **Copy and paste** this SQL:

```sql
-- Add INSERT policy for users table
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT 
    WITH CHECK (auth.uid() = id);
```

5. **Click "Run"** (or press Cmd/Ctrl + Enter)

### Step 2: Verify It Worked

You should see: **"Success. No rows returned"** or similar success message.

### Step 3: Test Login Again

1. Go back to your app: https://app.padelparrot.com
2. Try logging in again with your phone number
3. The error should be gone! ✅

---

## 🔍 Why This Happens

The `users` table has Row Level Security (RLS) enabled, which means:
- ✅ Users can **view** their own profile (SELECT policy exists)
- ✅ Users can **update** their own profile (UPDATE policy exists)
- ❌ Users **cannot insert** their own profile (INSERT policy was missing)

When you verify your OTP code, the app tries to create your user record in the `users` table, but RLS blocks it because there's no INSERT policy.

The fix adds an INSERT policy that allows users to create their own record, but only if the `id` matches their authenticated user ID (preventing users from creating records for others).

---

## 🆘 If It Still Doesn't Work

### Check 1: Database Schema is Set Up

Make sure you've run the complete database setup:

1. Go to **Table Editor** in Supabase
2. Check if you see these tables:
   - ✅ `users`
   - ✅ `matches`
   - ✅ `participants`

If tables are missing, run `supabase/complete-setup.sql` first.

### Check 2: RLS is Enabled

1. Go to **Table Editor** → `users` table
2. Check if **RLS** is enabled (should show a lock icon)
3. If RLS is disabled, enable it and re-run the fix SQL

### Check 3: Check Supabase Logs

1. Go to **Logs** → **API Logs** in Supabase
2. Look for errors when you try to log in
3. The error message will tell you exactly what's wrong

### Check 4: Verify Environment Variables

Make sure your production app has the correct Supabase credentials:

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Your project → **Settings** → **Environment Variables**
3. Verify:
   - `NEXT_PUBLIC_SUPABASE_URL` is set correctly
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly
4. **Redeploy** if you changed anything

---

## 📝 Alternative: Use the Trigger Instead

If you prefer, you can rely on the database trigger instead of the app code:

1. The trigger `handle_new_user()` automatically creates users when they sign up
2. You can modify the app code to skip the manual upsert
3. But the INSERT policy fix above is simpler and recommended

---

## ✅ Success Checklist

After applying the fix, you should be able to:
- [ ] Receive OTP code via SMS
- [ ] Enter verification code
- [ ] Successfully log in (no error)
- [ ] See your profile/matches page
- [ ] Create matches

---

**Need more help?** Check `SUPABASE_NEW_PROJECT_SETUP.md` for complete setup instructions.

