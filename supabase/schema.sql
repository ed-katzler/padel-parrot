-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE match_status AS ENUM ('upcoming', 'in_progress', 'completed', 'cancelled');
CREATE TYPE participant_status AS ENUM ('joined', 'left', 'maybe');

-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table
CREATE TABLE matches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT NOT NULL,
    max_players INTEGER DEFAULT 4 CHECK (max_players >= 2),
    current_players INTEGER DEFAULT 1 CHECK (current_players >= 0),
    status match_status DEFAULT 'upcoming',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT matches_current_players_not_exceed_max 
        CHECK (current_players <= max_players),
    CONSTRAINT matches_future_date 
        CHECK (date_time > NOW() - INTERVAL '1 hour')
);

-- Participants table
CREATE TABLE participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status participant_status DEFAULT 'joined',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique active participation per match
    UNIQUE(match_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_matches_date_time ON matches(date_time);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_creator ON matches(creator_id);
CREATE INDEX idx_participants_match ON participants(match_id);
CREATE INDEX idx_participants_user ON participants(user_id);
CREATE INDEX idx_participants_status ON participants(status);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at 
    BEFORE UPDATE ON matches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment match players count
CREATE OR REPLACE FUNCTION increment_match_players(match_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE matches 
    SET current_players = current_players + 1
    WHERE id = match_id 
    AND current_players < max_players;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match is full or does not exist';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement match players count
CREATE OR REPLACE FUNCTION decrement_match_players(match_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE matches 
    SET current_players = current_players - 1
    WHERE id = match_id 
    AND current_players > 0;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match has no players or does not exist';
    END IF;
END;
$$ LANGUAGE plpgsql;

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

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Matches policies
CREATE POLICY "Anyone can view upcoming matches" ON matches
    FOR SELECT USING (status = 'upcoming');

CREATE POLICY "Users can create matches" ON matches
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their matches" ON matches
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their matches" ON matches
    FOR DELETE USING (auth.uid() = creator_id);

-- Participants policies
CREATE POLICY "Anyone can view participants of visible matches" ON participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM matches 
            WHERE matches.id = participants.match_id 
            AND matches.status = 'upcoming'
        )
    );

CREATE POLICY "Users can join matches" ON participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON participants
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave matches they joined" ON participants
    FOR DELETE USING (auth.uid() = user_id);

-- Insert some sample data for testing
INSERT INTO users (id, phone, name) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', '+1234567890', 'Test User'),
    ('550e8400-e29b-41d4-a716-446655440001', '+0987654321', 'Demo Player');

INSERT INTO matches (id, creator_id, title, description, date_time, location, max_players, current_players) VALUES 
    (
        '660e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440000',
        'Evening Padel Session',
        'Casual game at the local club',
        NOW() + INTERVAL '2 days',
        'Padel Club Barcelona',
        4,
        2
    ),
    (
        '660e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440001',
        'Weekend Tournament Prep',
        'Practice session before the big tournament',
        NOW() + INTERVAL '3 days',
        'Elite Padel Center',
        4,
        3
    );

INSERT INTO participants (match_id, user_id, status) VALUES 
    ('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'joined'),
    ('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'joined'),
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'joined'); 