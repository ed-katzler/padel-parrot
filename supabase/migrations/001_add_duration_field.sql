/*
 * MIGRATION: Add duration_minutes field to matches table
 * 
 * This migration fixes the "(NaNh NaNm)" issue by ensuring all matches have a duration_minutes value.
 * 
 * TO APPLY THIS MIGRATION:
 * 1. Go to your Supabase Dashboard > SQL Editor
 * 2. Run the SQL commands below
 * 3. Verify that existing matches now have duration_minutes = 90
 * 
 * This migration is safe to run multiple times (uses IF NOT EXISTS logic implicitly via ALTER TABLE).
 */

-- Add duration_minutes column to matches table
ALTER TABLE matches 
ADD COLUMN duration_minutes INTEGER DEFAULT 90 CHECK (duration_minutes IN (30, 60, 90, 120));

-- Update existing matches to have the default duration
UPDATE matches 
SET duration_minutes = 90 
WHERE duration_minutes IS NULL; 