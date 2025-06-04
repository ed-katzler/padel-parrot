-- Update current_players to match actual participant count
UPDATE matches 
SET current_players = (
  SELECT COUNT(*) 
  FROM participants 
  WHERE participants.match_id = matches.id 
  AND participants.status = 'joined'
)
WHERE status = 'upcoming';

-- Create a function to sync player count
CREATE OR REPLACE FUNCTION sync_match_player_count(match_id UUID)
RETURNS INTEGER AS $$
DECLARE
    actual_count INTEGER;
BEGIN
    -- Count actual participants
    SELECT COUNT(*) INTO actual_count
    FROM participants 
    WHERE match_id = sync_match_player_count.match_id 
    AND status = 'joined';
    
    -- Update the match
    UPDATE matches 
    SET current_players = actual_count,
        updated_at = NOW()
    WHERE id = sync_match_player_count.match_id;
    
    RETURN actual_count;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically sync when participants change
CREATE OR REPLACE FUNCTION trigger_sync_match_players()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync the affected match
    PERFORM sync_match_player_count(
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.match_id
            ELSE NEW.match_id
        END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add triggers for participant changes
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