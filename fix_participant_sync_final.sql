-- FINAL PARTICIPANT COUNT SYNC FIX
-- This version properly handles existing triggers and functions

-- Step 1: Drop ALL existing triggers first (both old and new names)
DROP TRIGGER IF EXISTS sync_on_participant_insert ON participants;
DROP TRIGGER IF EXISTS sync_on_participant_update ON participants;
DROP TRIGGER IF EXISTS sync_on_participant_delete ON participants;
DROP TRIGGER IF EXISTS participant_insert_trigger ON participants;
DROP TRIGGER IF EXISTS participant_update_trigger ON participants;
DROP TRIGGER IF EXISTS participant_delete_trigger ON participants;

-- Step 2: Drop ALL existing functions (both old and new names)
DROP FUNCTION IF EXISTS sync_match_player_count(UUID);
DROP FUNCTION IF EXISTS update_match_participant_count(UUID);
DROP FUNCTION IF EXISTS trigger_sync_match_players();
DROP FUNCTION IF EXISTS on_participant_change();

-- Step 3: Create the new function with a completely unique name
CREATE FUNCTION fix_match_participant_count(target_match_uuid UUID)
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

-- Step 4: Create the trigger function with a unique name
CREATE FUNCTION handle_participant_change()
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
    PERFORM fix_match_participant_count(affected_match_id);
    
    -- Return the appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create triggers with completely new names
CREATE TRIGGER trg_participant_insert
    AFTER INSERT ON participants
    FOR EACH ROW EXECUTE FUNCTION handle_participant_change();

CREATE TRIGGER trg_participant_update
    AFTER UPDATE ON participants
    FOR EACH ROW EXECUTE FUNCTION handle_participant_change();

CREATE TRIGGER trg_participant_delete
    AFTER DELETE ON participants
    FOR EACH ROW EXECUTE FUNCTION handle_participant_change();

-- Step 6: Fix all existing match counts immediately
UPDATE matches 
SET current_players = (
    SELECT COUNT(*) 
    FROM participants p
    WHERE p.match_id = matches.id 
    AND p.status = 'joined'
);

-- Step 7: Show the results to verify it worked
SELECT 
    m.id,
    m.title,
    m.current_players as "Updated Count",
    (SELECT COUNT(*) FROM participants p WHERE p.match_id = m.id AND p.status = 'joined') as "Actual Count"
FROM matches m
WHERE m.title LIKE '%Mega%'
ORDER BY m.created_at DESC
LIMIT 3; 