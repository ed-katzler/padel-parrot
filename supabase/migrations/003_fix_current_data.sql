-- Fix any existing data discrepancies immediately
-- This will sync all matches with their actual participant counts

-- First, let's see what we're working with (this is just for logging)
-- The actual fix is below

-- Update all matches to have the correct current_players count
UPDATE matches 
SET current_players = (
  SELECT COUNT(*) 
  FROM participants 
  WHERE participants.match_id = matches.id 
  AND participants.status = 'joined'
),
updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM participants WHERE participants.match_id = matches.id
);

-- Update matches that have no participants to current_players = 0
UPDATE matches 
SET current_players = 0,
    updated_at = NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM participants 
  WHERE participants.match_id = matches.id 
  AND participants.status = 'joined'
) AND current_players != 0; 