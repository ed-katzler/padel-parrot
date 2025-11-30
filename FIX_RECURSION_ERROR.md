# 🔧 Fix "Infinite Recursion Detected" Error

## The Problem

You're seeing the error: **"infinite recursion detected in policy for relation 'matches'"**

This happens when RLS (Row Level Security) policies create a circular dependency:
- The `matches` policy checks the `participants` table
- The `participants` policy checks the `matches` table
- This creates an infinite loop! 🔄

## ✅ Quick Fix (1 minute)

### Step 1: Run the Fixed SQL

1. **Go to your Supabase Dashboard**
2. **Open SQL Editor** (left sidebar)
3. **Click "New query"**
4. **Copy and paste** the entire contents of `supabase/fix-match-creation-v2.sql`
5. **Click "Run"** (or press Cmd/Ctrl + Enter)

### Step 2: Test Match Creation

1. Go back to your app
2. Try creating a match again
3. The error should be gone! ✅

---

## 🔍 What Was Wrong

The previous fix had this policy:

```sql
-- ❌ BAD: Causes infinite recursion
CREATE POLICY "..." ON matches
    FOR SELECT USING (
        status = 'upcoming' 
        OR auth.uid() = creator_id
        OR EXISTS (
            SELECT 1 FROM participants  -- ← Checks participants
            WHERE participants.match_id = matches.id 
            AND participants.user_id = auth.uid()
        )
    );
```

When Supabase evaluates this:
1. Checks if match is upcoming ✅
2. Checks if user is creator ✅
3. Checks participants table → participants policy checks matches → matches policy checks participants → **INFINITE LOOP!** 🔄

### The Fix

```sql
-- ✅ GOOD: No recursion
CREATE POLICY "..." ON matches
    FOR SELECT USING (
        status = 'upcoming' 
        OR auth.uid() = creator_id  -- Only checks direct match properties
    );
```

Now:
- Matches policy only checks match properties (no participants check)
- Participants policy can check matches (one-way, no loop)
- No recursion! ✅

---

## 📝 What the Fix Does

### 1. Matches SELECT Policy
**Before**: Checked participants table (caused recursion)  
**After**: Only checks:
- Match status = 'upcoming' (public matches)
- User is the creator (your matches)

### 2. Participants SELECT Policy
**Before**: Could cause recursion  
**After**: Checks matches table (one-way, safe)

---

## 🆘 If It Still Doesn't Work

### Check 1: Verify Policies Were Updated

Run this in SQL Editor:

```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('matches', 'participants')
ORDER BY tablename, policyname;
```

You should see:
- `matches`: "Users can view upcoming matches or their own"
- `participants`: "Users can view participants of visible matches"

### Check 2: Clear Browser Cache

1. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. Or clear browser cache
3. Try again

### Check 3: Check Supabase Logs

1. Go to **Logs** → **API Logs** in Supabase
2. Try creating a match
3. Look for any remaining errors

---

## ✅ Success Checklist

After applying the fix, you should be able to:
- [ ] Create a match without recursion error
- [ ] See yourself as a participant
- [ ] See the match in your matches list
- [ ] Share the match link
- [ ] Have others join the match

---

## 💡 Why This Works

The key principle: **RLS policies should not create circular dependencies**

- ✅ Matches policy → checks match properties only
- ✅ Participants policy → can check matches (one-way)
- ❌ Never: Matches policy → checks participants → checks matches

This ensures Supabase can evaluate policies efficiently without infinite loops.

---

**The fix is in `supabase/fix-match-creation-v2.sql` - run it and you're good to go!** 🚀

