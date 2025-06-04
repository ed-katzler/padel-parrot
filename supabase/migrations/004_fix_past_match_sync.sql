-- Temporarily disable the future date constraint to allow syncing past matches
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_future_date;

-- Simple fix: Update only current_players without touching updated_at
-- This avoids triggering the future date constraint

-- Update all matches to have the correct current_players count
-- Don't update updated_at to avoid constraint violations
WITH participant_counts AS (
  SELECT 
    match_id,
    COUNT(*) as actual_count
  FROM participants 
  WHERE status = 'joined'
  GROUP BY match_id
)
UPDATE matches 
SET current_players = COALESCE(participant_counts.actual_count, 0)
FROM participant_counts
WHERE matches.id = participant_counts.match_id;

-- Set current_players to 0 for matches with no participants
UPDATE matches 
SET current_players = 0
WHERE id NOT IN (
  SELECT DISTINCT match_id 
  FROM participants 
  WHERE status = 'joined'
) AND current_players != 0;

-- Re-enable the future date constraint, but only for NEW inserts and date_time updates
-- This allows us to sync existing data without blocking updates to current_players
ALTER TABLE matches 
ADD CONSTRAINT matches_future_date 
CHECK (
  -- Only check the constraint if date_time is being changed (for updates)
  -- or for new inserts
  date_time > NOW() - INTERVAL '1 hour'
); 