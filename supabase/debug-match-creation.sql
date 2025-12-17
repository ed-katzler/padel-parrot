-- ============================================================================
-- DEBUG: Match Creation Issue - Check Current Policies
-- ============================================================================
-- Run this to see what policies are currently active
-- ============================================================================

-- Check all policies on matches table
SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'matches'
ORDER BY policyname;

-- Check all policies on participants table
SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'participants'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('matches', 'participants', 'users')
ORDER BY tablename;









