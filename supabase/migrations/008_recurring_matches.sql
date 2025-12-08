-- Migration: Add recurring match support
-- Allows users to create matches that automatically repeat on a schedule

-- Create recurrence type enum
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurrence_type') THEN
        CREATE TYPE recurrence_type AS ENUM ('none', 'weekly', 'biweekly');
    END IF;
END $$;

-- Add recurrence fields to matches table
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS recurrence_type recurrence_type DEFAULT 'none';

ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS series_id UUID;

-- Create index for finding recurring matches efficiently
CREATE INDEX IF NOT EXISTS idx_matches_recurrence ON matches(recurrence_type) WHERE recurrence_type != 'none';
CREATE INDEX IF NOT EXISTS idx_matches_series ON matches(series_id) WHERE series_id IS NOT NULL;

-- Function to get the next occurrence date based on recurrence type
CREATE OR REPLACE FUNCTION get_next_occurrence(
    current_date_time TIMESTAMP WITH TIME ZONE,
    rec_type recurrence_type
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    CASE rec_type
        WHEN 'weekly' THEN
            RETURN current_date_time + INTERVAL '7 days';
        WHEN 'biweekly' THEN
            RETURN current_date_time + INTERVAL '14 days';
        ELSE
            RETURN NULL;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if a series needs a new instance created
CREATE OR REPLACE FUNCTION series_needs_new_instance(check_series_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    latest_match RECORD;
BEGIN
    -- Get the latest match in the series
    SELECT * INTO latest_match
    FROM matches
    WHERE series_id = check_series_id
    ORDER BY date_time DESC
    LIMIT 1;
    
    -- No match found
    IF latest_match IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if recurrence is still active
    IF latest_match.recurrence_type = 'none' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if we've passed the end date
    IF latest_match.recurrence_end_date IS NOT NULL 
       AND latest_match.recurrence_end_date < NOW() THEN
        RETURN FALSE;
    END IF;
    
    -- Check if the latest match has passed and no future match exists
    IF latest_match.date_time < NOW() THEN
        -- Verify no future match exists in the series
        RETURN NOT EXISTS (
            SELECT 1 FROM matches 
            WHERE series_id = check_series_id 
            AND date_time > NOW()
        );
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
