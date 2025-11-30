-- ============================================================================
-- FIX: Match Creation - Fix Infinite Recursion Error
-- ============================================================================
-- This fixes the "infinite recursion detected in policy" error
-- The issue: RLS policies were checking each other in a loop
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Drop ALL existing policies that might conflict
DROP POLICY IF EXISTS "Anyone can view upcoming matches" ON matches;
DROP POLICY IF EXISTS "Users can view upcoming matches or their own" ON matches;
DROP POLICY IF EXISTS "Users can view participants of visible matches" ON participants;
DROP POLICY IF EXISTS "Anyone can view participants of visible matches" ON participants;

-- Fix 1: Matches SELECT policy - NO recursion
-- Users can see: upcoming matches OR matches they created
CREATE POLICY "Users can view upcoming matches or their own" ON matches
    FOR SELECT USING (
        status = 'upcoming' 
        OR auth.uid() = creator_id
    );

-- Fix 2: Participants SELECT policy - Check matches without recursion
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

-- Verify policies (should not show recursion)
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('matches', 'participants')
ORDER BY tablename, policyname;

