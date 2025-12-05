-- Migration: Allow match creators to remove participants from their matches
-- This enables the "remove player" feature on the match detail page

-- Allow match creators to remove participants from their matches
CREATE POLICY "Creators can remove participants from their matches" ON participants
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM matches 
            WHERE matches.id = participants.match_id 
            AND matches.creator_id = auth.uid()
        )
    );
