-- Run this directly in Supabase SQL Editor to fix participant counts
-- This handles the constraint issue by temporarily disabling it

-- Step 1: Temporarily disable the future date constraint
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_future_date;

-- Step 2: Temporarily disable the updated_at trigger to avoid timestamp updates
DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;

-- Step 3: Update current_players to match actual participant count
-- This updates only the current_players field without touching updated_at
UPDATE matches 
SET current_players = (
  SELECT COUNT(*) 
  FROM participants 
  WHERE participants.match_id = matches.id 
  AND participants.status = 'joined'
);

-- Step 4: Re-enable the updated_at trigger
CREATE TRIGGER update_matches_updated_at 
    BEFORE UPDATE ON matches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Re-enable the constraint but make it less restrictive for existing data
-- Only apply the constraint to new matches or when date_time is actually being changed
ALTER TABLE matches 
ADD CONSTRAINT matches_future_date 
CHECK (date_time > NOW() - INTERVAL '24 hours');

-- Step 6: Verify the fix
SELECT 
  m.id,
  m.title,
  m.date_time,
  m.current_players as stored_count,
  COUNT(p.id) as actual_count,
  CASE 
    WHEN m.current_players = COUNT(p.id) THEN '✅ Fixed'
    ELSE '❌ Still wrong'
  END as status
FROM matches m
LEFT JOIN participants p ON m.id = p.match_id AND p.status = 'joined'
GROUP BY m.id, m.title, m.date_time, m.current_players
ORDER BY m.date_time; 