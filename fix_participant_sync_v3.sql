-- PARTICIPANT COUNT SYNC FIX (Version 3 - Final)
-- This completely eliminates the ambiguous column reference error

-- Step 1: Drop the old function completely first
DROP FUNCTION IF EXISTS sync_match_player_count(UUID);

-- Step 2: Create a completely new function with different name to avoid conflicts
CREATE OR REPLACE FUNCTION update_match_participant_count(target_match_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    participant_count INTEGER;
BEGIN
    -- Count participants with explicit table qualification
    SELECT COUNT(*) INTO participant_count
    FROM participants p
    WHERE p.match_id = target_match_uuid 
    AND p.status = 'joined';
    
    -- Update the matches table with explicit qualification
    UPDATE matches m
    SET current_players = participant_count
    WHERE m.id = target_match_uuid;
    
    RETURN participant_count;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Drop old triggers and functions
DROP TRIGGER IF EXISTS sync_on_participant_insert ON participants;
DROP TRIGGER IF EXISTS sync_on_participant_update ON participants;
DROP TRIGGER IF EXISTS sync_on_participant_delete ON participants;
DROP FUNCTION IF EXISTS trigger_sync_match_players();

-- Step 4: Create new trigger function
CREATE OR REPLACE FUNCTION on_participant_change()
RETURNS TRIGGER AS $$
DECLARE
    affected_match_id UUID;
BEGIN
    -- Get the match ID from the appropriate record
    IF TG_OP = 'DELETE' THEN
        affected_match_id := OLD.match_id;
    ELSE
        affected_match_id := NEW.match_id;
    END IF;
    
    -- Update the participant count
    PERFORM update_match_participant_count(affected_match_id);
    
    -- Return the appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create new triggers
CREATE TRIGGER participant_insert_trigger
    AFTER INSERT ON participants
    FOR EACH ROW EXECUTE FUNCTION on_participant_change();

CREATE TRIGGER participant_update_trigger
    AFTER UPDATE ON participants
    FOR EACH ROW EXECUTE FUNCTION on_participant_change();

CREATE TRIGGER participant_delete_trigger
    AFTER DELETE ON participants
    FOR EACH ROW EXECUTE FUNCTION on_participant_change();

-- Step 6: Fix all existing match counts
UPDATE matches 
SET current_players = (
    SELECT COUNT(*) 
    FROM participants p
    WHERE p.match_id = matches.id 
    AND p.status = 'joined'
);

-- Step 7: Update the API client to use the new function name
-- NOTE: You'll need to update the client.ts file to call update_match_participant_count instead of sync_match_player_count

-- Step 8: Verify the fix worked
SELECT 
    m.id,
    m.title,
    m.current_players as "Database Count",
    (SELECT COUNT(*) FROM participants p WHERE p.match_id = m.id AND p.status = 'joined') as "Actual Count"
FROM matches m
ORDER BY m.created_at DESC
LIMIT 5; 