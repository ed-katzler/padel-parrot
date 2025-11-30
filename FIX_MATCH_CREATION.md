# 🔧 Fix "Failed to join created match" Error

## The Problem

When creating a match, you see the error: **"Failed to join created match. Please try again."**

This happens because:
1. The match is created successfully ✅
2. But when trying to add you as a participant, RLS (Row Level Security) blocks it
3. The match gets deleted automatically (to prevent orphaned matches)
4. You see the error message

## ✅ Quick Fix (2 minutes)

### Step 1: Run the Fix SQL

1. **Go to your Supabase Dashboard**
2. **Open SQL Editor** (left sidebar)
3. **Click "New query"**
4. **Copy and paste** the entire contents of `supabase/fix-match-creation.sql`
5. **Click "Run"** (or press Cmd/Ctrl + Enter)

### Step 2: Verify It Worked

You should see:
- **"Success"** message
- A list of policies showing the updated policies

### Step 3: Test Match Creation Again

1. Go back to your app
2. Try creating a match again
3. It should work now! ✅

---

## 🔍 Why This Happens

The Row Level Security (RLS) policy for matches only allows viewing matches with `status = 'upcoming'`. However:

1. When you create a match, it's immediately set to `status = 'upcoming'` ✅
2. But when the app tries to add you as a participant, it needs to verify the match exists
3. Due to RLS timing or policy restrictions, the participant insertion might fail
4. The fix updates the policies to ensure:
   - Users can always see matches they created
   - Users can see matches they're participating in
   - Participants can be viewed for matches the user created

---

## 🆘 If It Still Doesn't Work

### Check 1: Verify Database Setup

Make sure you've run the complete database setup:

1. Go to **Table Editor** in Supabase
2. Check if you see these tables:
   - ✅ `users`
   - ✅ `matches`
   - ✅ `participants`

If tables are missing, run `supabase/complete-setup.sql` first.

### Check 2: Check Supabase Logs

1. Go to **Logs** → **API Logs** in Supabase
2. Try creating a match
3. Look for errors in the logs
4. The error message will tell you exactly what's wrong

### Check 3: Verify RLS is Enabled

1. Go to **Table Editor** → `matches` table
2. Check if **RLS** is enabled (should show a lock icon)
3. Go to **Table Editor** → `participants` table
4. Check if **RLS** is enabled

### Check 4: Check Browser Console

1. Open browser developer tools (F12)
2. Go to **Console** tab
3. Try creating a match
4. Look for error messages - they'll show the exact Supabase error

---

## 📝 What the Fix Does

The fix updates two RLS policies:

### 1. Matches SELECT Policy
**Before**: Only shows matches with `status = 'upcoming'`  
**After**: Shows matches that are:
- Upcoming matches (public)
- Matches you created (private or public)
- Matches you're participating in

### 2. Participants SELECT Policy
**Before**: Only shows participants of upcoming matches  
**After**: Shows participants of:
- Upcoming matches (public)
- Matches you created (so you can see who joined)

---

## ✅ Success Checklist

After applying the fix, you should be able to:
- [ ] Create a match successfully
- [ ] See yourself as a participant
- [ ] See the match in your "My Upcoming Matches" section
- [ ] Share the match link
- [ ] Have others join the match

---

## 🔄 Alternative: Check if Match Already Exists

If you're still having issues, you can check if matches are being created but not visible:

1. Go to **Table Editor** → `matches` table in Supabase
2. Check if you see any matches you tried to create
3. If matches exist but you can't see them, the SELECT policy fix above will help

---

**Need more help?** Check `SUPABASE_NEW_PROJECT_SETUP.md` for complete setup instructions.

