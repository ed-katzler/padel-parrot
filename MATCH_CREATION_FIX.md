# 🔧 Match Creation Fix - Root Cause Identified

## The Problem

You can't create matches because of a **Row Level Security (RLS) policy issue**. Here's what happens:

1. ✅ Match is created successfully in the `matches` table
2. ❌ When trying to add the creator as a participant, the operation fails
3. ❌ The match gets automatically deleted (to prevent orphaned matches)
4. ❌ You see the error: "Failed to join created match. Please try again."

## Root Cause

The issue is in the **matches SELECT policy** in `supabase/complete-setup.sql`:

**Before (BROKEN):**
```sql
CREATE POLICY "Anyone can view upcoming matches" ON matches
    FOR SELECT USING (status = 'upcoming');
```

This policy only allows viewing matches with `status = 'upcoming'`, but **doesn't allow creators to see their own matches**. 

When the participant INSERT happens:
1. A trigger fires (`sync_on_participant_insert`)
2. The trigger calls `sync_match_player_count()` which needs to:
   - SELECT from participants (subject to participants SELECT policy)
   - UPDATE the matches table
3. The participants SELECT policy checks if the match is visible by querying the matches table
4. **If the creator can't see their own match, the check fails, causing the entire operation to fail**

## The Fix

I've updated `supabase/complete-setup.sql` with the correct policies:

**After (FIXED):**
```sql
-- Matches SELECT: Users can see upcoming matches OR matches they created
CREATE POLICY "Users can view upcoming matches or their own" ON matches
    FOR SELECT USING (
        status = 'upcoming' 
        OR auth.uid() = creator_id
    );

-- Participants SELECT: Users can see participants of visible matches
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

## How to Apply the Fix

### Option 1: Run the Fix Script (Recommended)

1. Go to your **Supabase Dashboard**
2. Open **SQL Editor**
3. Copy and paste the contents of `supabase/fix-match-creation-complete.sql`
4. Click **Run**

This will:
- Drop all existing policies
- Recreate them with the correct permissions
- Show you a verification list

### Option 2: Update Existing Database

If you've already run `complete-setup.sql`, you can just run this SQL:

```sql
-- Drop the old policy
DROP POLICY IF EXISTS "Anyone can view upcoming matches" ON matches;

-- Create the new policy
CREATE POLICY "Users can view upcoming matches or their own" ON matches
    FOR SELECT USING (
        status = 'upcoming' 
        OR auth.uid() = creator_id
    );

-- Update participants policy
DROP POLICY IF EXISTS "Anyone can view participants of visible matches" ON participants;

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

## Verification

After applying the fix, verify it worked:

```sql
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('matches', 'participants')
ORDER BY tablename, cmd;
```

You should see:
- `matches` | `Users can view upcoming matches or their own` | `SELECT`
- `participants` | `Users can view participants of visible matches` | `SELECT`

## Test

1. Try creating a match in your app
2. It should work now! ✅
3. You should see yourself as a participant
4. The match should appear in your "My Upcoming Matches" section

## Why This Happened

The original `complete-setup.sql` had a restrictive matches SELECT policy that only showed public upcoming matches. This was fine for viewing, but broke match creation because:

1. The trigger that syncs participant counts needs to read the match
2. The participants SELECT policy checks if the match is visible
3. If the creator can't see their own match, these operations fail

The fix ensures creators can always see their own matches, regardless of status, which allows the participant insertion and trigger operations to succeed.

