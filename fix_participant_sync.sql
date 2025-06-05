-- COMPREHENSIVE PARTICIPANT COUNT SYNC FIX
-- Run this in Supabase SQL Editor to fix all sync issues

-- Step 1: Create the sync function if it doesn't exist
CREATE OR REPLACE FUNCTION sync_match_player_count(match_id UUID)
RETURNS INTEGER AS $$
DECLARE
    actual_count INTEGER;
BEGIN
    -- Count actual participants with 'joined' status
    SELECT COUNT(*) INTO actual_count
    FROM participants 
    WHERE match_id = sync_match_player_count.match_id 
    AND status = 'joined';
    
    -- Update the match current_players field without touching updated_at
    -- This avoids constraint issues with past matches
    UPDATE matches 
    SET current_players = actual_count
    WHERE id = sync_match_player_count.match_id;
    
    RETURN actual_count;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger function for automatic syncing
CREATE OR REPLACE FUNCTION trigger_sync_match_players()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync the affected match whenever participants change
    PERFORM sync_match_player_count(
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.match_id
            ELSE NEW.match_id
        END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 3: Remove existing triggers (if any) and create new ones
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

-- Step 4: Fix all existing matches to have correct participant counts
-- This handles the immediate sync issue
UPDATE matches 
SET current_players = (
    SELECT COUNT(*) 
    FROM participants 
    WHERE participants.match_id = matches.id 
    AND participants.status = 'joined'
);

-- Step 5: Show results
SELECT 
    m.id,
    m.title,
    m.current_players as "Updated Count",
    (SELECT COUNT(*) FROM participants p WHERE p.match_id = m.id AND p.status = 'joined') as "Actual Participants"
FROM matches m
ORDER BY m.created_at DESC
LIMIT 10; 