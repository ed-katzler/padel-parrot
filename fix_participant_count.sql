-- Run this directly in Supabase SQL Editor to fix participant counts
-- This temporarily disables the constraint, fixes the data, then re-enables it

-- Step 1: Temporarily disable the future date constraint
ALTER TABLE matches DROP CONSTRAINT matches_future_date;

-- Step 2: Update current_players to match actual participant count
UPDATE matches 
SET current_players = (
  SELECT COUNT(*) 
  FROM participants 
  WHERE participants.match_id = matches.id 
  AND participants.status = 'joined'
);

-- Step 3: Re-enable the constraint
ALTER TABLE matches 
ADD CONSTRAINT matches_future_date 
CHECK (date_time > NOW() - INTERVAL '1 hour');

-- Step 4: Verify the fix
SELECT 
  m.id,
  m.title,
  m.current_players as stored_count,
  COUNT(p.id) as actual_count,
  CASE 
    WHEN m.current_players = COUNT(p.id) THEN '✅ Fixed'
    ELSE '❌ Still wrong'
  END as status
FROM matches m
LEFT JOIN participants p ON m.id = p.match_id AND p.status = 'joined'
GROUP BY m.id, m.title, m.current_players
ORDER BY m.date_time; 