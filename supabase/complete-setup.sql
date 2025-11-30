-- ============================================================================
-- PADEL PARROT - COMPLETE DATABASE SETUP
-- ============================================================================
-- This script sets up the entire database schema and all migrations
-- Run this in your new Supabase project's SQL Editor
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE match_status AS ENUM ('upcoming', 'in_progress', 'completed', 'cancelled');
CREATE TYPE participant_status AS ENUM ('joined', 'left', 'maybe');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 90 CHECK (duration_minutes IN (30, 60, 90, 120)),
    location TEXT NOT NULL,
    max_players INTEGER DEFAULT 4 CHECK (max_players >= 2),
    current_players INTEGER DEFAULT 1 CHECK (current_players >= 0),
    status match_status DEFAULT 'upcoming',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT matches_current_players_not_exceed_max 
        CHECK (current_players <= max_players),
    CONSTRAINT matches_future_date 
        CHECK (date_time > NOW() - INTERVAL '1 hour')
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status participant_status DEFAULT 'joined',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique active participation per match
    UNIQUE(match_id, user_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_matches_date_time ON matches(date_time);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_creator ON matches(creator_id);
CREATE INDEX IF NOT EXISTS idx_participants_match ON participants(match_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to automatically create user on signup
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (id, phone)
    VALUES (NEW.id, NEW.phone)
    ON CONFLICT (phone) DO UPDATE SET
        id = NEW.id,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync match player count
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

-- Function to trigger sync on participant changes
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

-- Function to fix match participant count (for manual sync)
CREATE OR REPLACE FUNCTION fix_match_participant_count(target_match_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    actual_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO actual_count
    FROM participants 
    WHERE match_id = target_match_uuid 
    AND status = 'joined';
    
    UPDATE matches 
    SET current_players = actual_count,
        updated_at = NOW()
    WHERE id = target_match_uuid;
    
    RETURN actual_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at 
    BEFORE UPDATE ON matches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Triggers for participant sync
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

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view upcoming matches" ON matches;
DROP POLICY IF EXISTS "Users can view upcoming matches or their own" ON matches;
DROP POLICY IF EXISTS "Users can create matches" ON matches;
DROP POLICY IF EXISTS "Creators can update their matches" ON matches;
DROP POLICY IF EXISTS "Creators can delete their matches" ON matches;
DROP POLICY IF EXISTS "Anyone can view participants of visible matches" ON participants;
DROP POLICY IF EXISTS "Users can view participants of visible matches" ON participants;
DROP POLICY IF EXISTS "Users can join matches" ON participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON participants;
DROP POLICY IF EXISTS "Users can leave matches they joined" ON participants;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Matches policies
-- SELECT: Users can see upcoming matches OR matches they created
CREATE POLICY "Users can view upcoming matches or their own" ON matches
    FOR SELECT USING (
        status = 'upcoming' 
        OR auth.uid() = creator_id
    );

CREATE POLICY "Users can create matches" ON matches
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their matches" ON matches
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their matches" ON matches
    FOR DELETE USING (auth.uid() = creator_id);

-- Participants policies
-- SELECT: Users can see participants of visible matches (upcoming OR matches they created)
CREATE POLICY "Users can view participants of visible matches" ON participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM matches 
            WHERE matches.id = participants.match_id 
            AND (
                matches.status = 'upcoming'
                OR matches.creator_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can join matches" ON participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON participants
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave matches they joined" ON participants
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- INITIAL DATA SYNC
-- ============================================================================

-- Sync all existing matches with their actual participant counts
UPDATE matches 
SET current_players = (
  SELECT COUNT(*) 
  FROM participants 
  WHERE participants.match_id = matches.id 
  AND participants.status = 'joined'
),
updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM participants WHERE participants.match_id = matches.id
);

-- Update matches that have no participants to current_players = 0
UPDATE matches 
SET current_players = 0,
    updated_at = NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM participants 
  WHERE participants.match_id = matches.id 
  AND participants.status = 'joined'
) AND current_players != 0;

-- ============================================================================
-- COMPLETE!
-- ============================================================================
-- Your database is now fully set up with:
-- ✅ All tables (users, matches, participants)
-- ✅ All indexes for performance
-- ✅ All functions and triggers
-- ✅ Row Level Security policies
-- ✅ Automatic participant count syncing
-- 
-- Next steps:
-- 1. Configure phone authentication in Supabase dashboard
-- 2. Update your environment variables
-- 3. Test the connection
-- ============================================================================

