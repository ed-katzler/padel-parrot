-- ============================================================================
-- COMPLETE FIX: Match Creation - All Issues Fixed
-- ============================================================================
-- This fixes ALL match creation issues:
-- 1. Infinite recursion
-- 2. Policy conflicts
-- 3. Participant insertion failures
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL existing policies to start fresh
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view upcoming matches" ON matches;
DROP POLICY IF EXISTS "Users can view upcoming matches or their own" ON matches;
DROP POLICY IF EXISTS "Users can create matches" ON matches;
DROP POLICY IF EXISTS "Creators can update their matches" ON matches;
DROP POLICY IF EXISTS "Creators can delete their matches" ON matches;

DROP POLICY IF EXISTS "Anyone can view participants of visible matches" ON participants;
DROP POLICY IF EXISTS "Users can view participants of visible matches" ON participants;
DROP POLICY IF EXISTS "Users can join matches" ON participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON participants;
DROP POLICY IF EXISTS "Users can leave matches they joined" ON participants;

-- ============================================================================
-- STEP 2: Recreate MATCHES policies (no recursion)
-- ============================================================================

-- SELECT: Users can see upcoming matches OR matches they created
CREATE POLICY "Users can view upcoming matches or their own" ON matches
    FOR SELECT USING (
        status = 'upcoming' 
        OR auth.uid() = creator_id
    );

-- INSERT: Users can create matches (they become the creator)
CREATE POLICY "Users can create matches" ON matches
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- UPDATE: Creators can update their matches
CREATE POLICY "Creators can update their matches" ON matches
    FOR UPDATE USING (auth.uid() = creator_id);

-- DELETE: Creators can delete their matches
CREATE POLICY "Creators can delete their matches" ON matches
    FOR DELETE USING (auth.uid() = creator_id);

-- ============================================================================
-- STEP 3: Recreate PARTICIPANTS policies (one-way checks only)
-- ============================================================================

-- SELECT: Users can see participants of visible matches
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

-- INSERT: Users can join matches (including when creating)
-- This is the critical one for match creation!
CREATE POLICY "Users can join matches" ON participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own participation
CREATE POLICY "Users can update their own participation" ON participants
    FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: Users can leave matches they joined
CREATE POLICY "Users can leave matches they joined" ON participants
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 4: Verify everything is set up correctly
-- ============================================================================
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN '✅ View'
        WHEN cmd = 'INSERT' THEN '✅ Create/Join'
        WHEN cmd = 'UPDATE' THEN '✅ Update'
        WHEN cmd = 'DELETE' THEN '✅ Delete'
        ELSE cmd
    END as permission
FROM pg_policies 
WHERE tablename IN ('matches', 'participants')
ORDER BY tablename, cmd, policyname;

-- Expected output:
-- matches | Users can view upcoming matches or their own | SELECT | ✅ View
-- matches | Users can create matches | INSERT | ✅ Create/Join
-- matches | Creators can update their matches | UPDATE | ✅ Update
-- matches | Creators can delete their matches | DELETE | ✅ Delete
-- participants | Users can view participants of visible matches | SELECT | ✅ View
-- participants | Users can join matches | INSERT | ✅ Create/Join
-- participants | Users can update their own participation | UPDATE | ✅ Update
-- participants | Users can leave matches they joined | DELETE | ✅ Delete









