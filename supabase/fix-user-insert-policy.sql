-- ============================================================================
-- FIX: Allow users to insert themselves into the users table
-- ============================================================================
-- This fixes the "Database error saving user" error during authentication
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Add INSERT policy for users table
-- This allows authenticated users to create their own user record
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Verify the policy was created
SELECT * FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

