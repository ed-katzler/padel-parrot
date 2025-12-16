# 🔍 Debug Match Creation Issue

## Current Problem

You're still getting: **"Failed to join created match. Please try again."**

This means:
- ✅ Match is being created successfully
- ❌ Adding creator as participant is failing

## 🔧 Step-by-Step Debugging

### Step 1: Check Current Policies

Run this in Supabase SQL Editor to see what policies you currently have:

```sql
-- See all current policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('matches', 'participants')
ORDER BY tablename, cmd;
```

**What to look for:**
- Do you have an INSERT policy on `participants`? (Should be "Users can join matches")
- Do you have a SELECT policy on `matches`? (Should allow viewing your own matches)

### Step 2: Run Complete Fix

Run `supabase/fix-match-creation-complete.sql` - this will:
1. Drop ALL existing policies
2. Recreate them properly
3. Show you what was created

### Step 3: Check Supabase Logs

1. Go to **Logs** → **API Logs** in Supabase
2. Try creating a match
3. Look for the error - it will show the exact reason

**Common errors you might see:**
- `new row violates row-level security policy` → RLS policy issue
- `duplicate key value violates unique constraint` → Already a participant
- `permission denied for table participants` → Missing INSERT policy

### Step 4: Test with SQL Directly

Try this in Supabase SQL Editor (replace `YOUR_USER_ID` with your actual user ID):

```sql
-- First, create a test match
INSERT INTO matches (
    creator_id,
    title,
    date_time,
    location,
    max_players,
    current_players,
    duration_minutes,
    is_public
) VALUES (
    auth.uid(),  -- Your user ID
    'Test Match',
    NOW() + INTERVAL '1 day',
    'Test Location',
    4,
    1,
    90,
    false
) RETURNING id;

-- Then try to add yourself as participant
-- (Use the match ID from above)
INSERT INTO participants (match_id, user_id, status)
VALUES (
    'MATCH_ID_FROM_ABOVE',  -- Replace with actual ID
    auth.uid(),
    'joined'
);
```

**If this works:** The issue is in the app code
**If this fails:** The issue is in the database policies

## 🆘 Most Likely Issues

### Issue 1: Missing INSERT Policy on Participants

**Check:**
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'participants' 
AND cmd = 'INSERT';
```

**Fix:** Run `fix-match-creation-complete.sql`

### Issue 2: Match Not Visible When Inserting Participant

The participant INSERT might be checking if the match exists, but RLS is blocking it.

**Fix:** The complete fix SQL ensures matches you create are always visible.

### Issue 3: Trigger Conflict

The trigger that syncs player counts might be interfering.

**Check:**
```sql
SELECT * FROM pg_trigger 
WHERE tgname LIKE '%participant%';
```

## ✅ Complete Fix Script

The file `supabase/fix-match-creation-complete.sql` will:
- ✅ Drop all conflicting policies
- ✅ Recreate them without recursion
- ✅ Ensure participants INSERT works
- ✅ Show you what was created

**Run that script, then test again!**

## 📋 What to Share With Me

If it still doesn't work, share:

1. **Output from Step 1** (current policies)
2. **Error from Supabase Logs** (Step 3)
3. **Result from Step 4** (direct SQL test)

This will help me pinpoint the exact issue!






