-- Add duration_minutes column to matches table
ALTER TABLE matches 
ADD COLUMN duration_minutes INTEGER DEFAULT 90 CHECK (duration_minutes IN (30, 60, 90, 120));

-- Update existing matches to have the default duration
UPDATE matches 
SET duration_minutes = 90 
WHERE duration_minutes IS NULL; 