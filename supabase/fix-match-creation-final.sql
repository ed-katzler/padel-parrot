-- ============================================================================
-- FIX: Match Creation - Fix Infinite Recursion Error (FINAL VERSION)
-- ============================================================================
-- This fixes the "infinite recursion detected" and "policy already exists" errors
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Step 1: Drop ALL existing policies that might conflict
DROP POLICY IF EXISTS "Anyone can view upcoming matches" ON matches;
DROP POLICY IF EXISTS "Users can view upcoming matches or their own" ON matches;
DROP POLICY IF EXISTS "Users can view participants of visible matches" ON participants;
DROP POLICY IF EXISTS "Anyone can view participants of visible matches" ON participants;

-- Step 2: Create the fixed matches SELECT policy (NO recursion)
-- Users can see: upcoming matches OR matches they created
CREATE POLICY "Users can view upcoming matches or their own" ON matches
    FOR SELECT USING (
        status = 'upcoming' 
        OR auth.uid() = creator_id
    );

-- Step 3: Create the fixed participants SELECT policy (one-way check, safe)
-- Users can see participants of: upcoming matches OR matches they created
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

-- Step 4: Verify policies were created correctly
SELECT 
    tablename, 
    policyname, 
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN '✅'
        ELSE '⚠️'
    END as status
FROM pg_policies 
WHERE tablename IN ('matches', 'participants')
    AND policyname LIKE '%view%'
ORDER BY tablename, policyname;

-- Expected output:
-- matches | Users can view upcoming matches or their own | SELECT | ✅
-- participants | Users can view participants of visible matches | SELECT | ✅

