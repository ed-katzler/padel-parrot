-- FIXED PARTICIPANT COUNT SYNC (Version 2)
-- This fixes the "column reference 'match_id' is ambiguous" error

-- Step 1: Create the corrected sync function
CREATE OR REPLACE FUNCTION sync_match_player_count(input_match_id UUID)
RETURNS INTEGER AS $$
DECLARE
    actual_count INTEGER;
BEGIN
    -- Count actual participants with 'joined' status
    -- Use the parameter name to avoid ambiguity
    SELECT COUNT(*) INTO actual_count
    FROM participants 
    WHERE participants.match_id = input_match_id 
    AND participants.status = 'joined';
    
    -- Update the match current_players field
    UPDATE matches 
    SET current_players = actual_count
    WHERE matches.id = input_match_id;
    
    RETURN actual_count;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create corrected trigger function
CREATE OR REPLACE FUNCTION trigger_sync_match_players()
RETURNS TRIGGER AS $$
DECLARE
    target_match_id UUID;
BEGIN
    -- Get the match_id from the appropriate record
    target_match_id := CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.match_id
        ELSE NEW.match_id
    END;
    
    -- Sync the affected match
    PERFORM sync_match_player_count(target_match_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 3: Drop and recreate triggers
DROP TRIGGER IF EXISTS sync_on_participant_insert ON participants;
DROP TRIGGER IF EXISTS sync_on_participant_update ON participants;
DROP TRIGGER IF EXISTS sync_on_participant_delete ON participants;

CREATE TRIGGER sync_on_participant_insert
    AFTER INSERT ON participants
    FOR EACH ROW EXECUTE FUNCTION trigger_sync_match_players();

CREATE TRIGGER sync_on_participant_update
    AFTER UPDATE ON participants
    FOR EACH ROW EXECUTE FUNCTION trigger_sync_match_players();

CREATE TRIGGER sync_on_participant_delete
    AFTER DELETE ON participants
    FOR EACH ROW EXECUTE FUNCTION trigger_sync_match_players();

-- Step 4: Fix all existing data
UPDATE matches 
SET current_players = (
    SELECT COUNT(*) 
    FROM participants 
    WHERE participants.match_id = matches.id 
    AND participants.status = 'joined'
);

-- Step 5: Test the function (optional - will show results)
SELECT 
    m.id,
    m.title,
    m.current_players as "Current Count",
    (SELECT COUNT(*) FROM participants p WHERE p.match_id = m.id AND p.status = 'joined') as "Actual Participants"
FROM matches m
WHERE m.title = 'The Mega Match'
LIMIT 5; 