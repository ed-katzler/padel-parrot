# 🔧 Fix "Policy Already Exists" Error

## The Problem

You're seeing: **"policy 'Users can view participants of visible matches' for table 'participants' already exists"**

This happens when you try to run the fix SQL, but the policy already exists from a previous attempt.

## ✅ Quick Fix

### Option 1: Use the Final Version (Recommended)

1. **Go to your Supabase Dashboard** → **SQL Editor**
2. **Run** `supabase/fix-match-creation-final.sql`
   - This version properly drops all existing policies first
   - Then creates the new ones

### Option 2: Manual Fix

If you prefer to run it manually:

1. **First, drop the existing policy:**
```sql
DROP POLICY IF EXISTS "Users can view participants of visible matches" ON participants;
DROP POLICY IF EXISTS "Users can view upcoming matches or their own" ON matches;
```

2. **Then create the new ones:**
```sql
-- Matches policy (no recursion)
CREATE POLICY "Users can view upcoming matches or their own" ON matches
    FOR SELECT USING (
        status = 'upcoming' 
        OR auth.uid() = creator_id
    );

-- Participants policy (one-way, safe)
CREATE POLICY "Users can view participants of visible matches" ON participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM matches 
            WHERE matches.id = participants.match_id 
            AND (
                matches.status = 'upcoming'
                OR matches.creator_id = auth.uid()
            )
        )
    );
```

## 🔍 Verify It Worked

After running the SQL, you should see:
- ✅ "Success" message
- ✅ A table showing the two policies were created

## ✅ Test

1. Go back to your app
2. Try creating a match
3. Should work now! ✅

---

**The final version is in `supabase/fix-match-creation-final.sql` - use that one!**

