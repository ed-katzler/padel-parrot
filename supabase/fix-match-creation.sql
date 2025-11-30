-- ============================================================================
-- FIX: Match Creation - Allow users to see their own matches
-- ============================================================================
-- This fixes the "Failed to join created match" error
-- The issue: Users can't see matches they just created due to RLS policy
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Update matches SELECT policy to allow users to see matches they created
DROP POLICY IF EXISTS "Anyone can view upcoming matches" ON matches;

-- New policy: Users can see upcoming matches OR matches they created
-- NOTE: We don't check participants here to avoid infinite recursion
CREATE POLICY "Users can view upcoming matches or their own" ON matches
    FOR SELECT USING (
        status = 'upcoming' 
        OR auth.uid() = creator_id
    );

-- Also ensure participants can be viewed for matches the user created
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

-- Verify policies
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('matches', 'participants')
ORDER BY tablename, policyname;

