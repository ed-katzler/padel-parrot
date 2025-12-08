-- Migration: Create clubs and districts tables for Portugal padel clubs database
-- This replaces the simple locations table with a comprehensive clubs system

-- Create districts reference table for Portuguese regions
CREATE TABLE IF NOT EXISTS districts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Insert Portuguese districts in geographic order (North to South)
INSERT INTO districts (id, name, display_order) VALUES
  ('porto', 'Porto', 1),
  ('braga', 'Braga', 2),
  ('viana_do_castelo', 'Viana do Castelo', 3),
  ('vila_real', 'Vila Real', 4),
  ('braganca', 'Bragança', 5),
  ('aveiro', 'Aveiro', 6),
  ('viseu', 'Viseu', 7),
  ('guarda', 'Guarda', 8),
  ('coimbra', 'Coimbra', 9),
  ('castelo_branco', 'Castelo Branco', 10),
  ('leiria', 'Leiria', 11),
  ('santarem', 'Santarém', 12),
  ('lisboa', 'Lisboa', 13),
  ('setubal', 'Setúbal', 14),
  ('portalegre', 'Portalegre', 15),
  ('evora', 'Évora', 16),
  ('beja', 'Beja', 17),
  ('faro', 'Faro (Algarve)', 18),
  ('madeira', 'Madeira', 19),
  ('acores', 'Açores', 20)
ON CONFLICT (id) DO NOTHING;

-- Create comprehensive clubs table
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  
  -- Contact & Web
  website TEXT,
  phone TEXT,
  email TEXT,
  
  -- Address
  address TEXT,
  city TEXT,
  district_id TEXT REFERENCES districts(id),
  postal_code TEXT,
  country TEXT DEFAULT 'Portugal',
  
  -- Geolocation
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  google_place_id TEXT UNIQUE,
  
  -- Facilities
  num_courts INTEGER,
  court_type TEXT CHECK (court_type IN ('indoor', 'outdoor', 'mixed')),
  has_lighting BOOLEAN DEFAULT true,
  amenities TEXT[] DEFAULT '{}',
  
  -- Metadata
  description TEXT,
  image_url TEXT,
  source TEXT,
  verified BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_clubs_district ON clubs(district_id);
CREATE INDEX IF NOT EXISTS idx_clubs_city ON clubs(city);
CREATE INDEX IF NOT EXISTS idx_clubs_name ON clubs(name);
CREATE INDEX IF NOT EXISTS idx_clubs_active ON clubs(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_clubs_google_place_id ON clubs(google_place_id) WHERE google_place_id IS NOT NULL;

-- Full-text search index for club search
CREATE INDEX IF NOT EXISTS idx_clubs_search ON clubs USING gin(
  to_tsvector('portuguese', coalesce(name, '') || ' ' || coalesce(city, '') || ' ' || coalesce(address, ''))
);

-- Enable RLS on clubs table
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active clubs
CREATE POLICY "Allow all users to read active clubs" ON clubs
  FOR SELECT
  TO authenticated
  USING (active = true);

-- Allow anonymous users to read active clubs (for join page before login)
CREATE POLICY "Allow anonymous to read active clubs" ON clubs
  FOR SELECT
  TO anon
  USING (active = true);

-- Allow service role full access for admin operations
CREATE POLICY "Allow service role to manage clubs" ON clubs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable RLS on districts table
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read districts
CREATE POLICY "Allow all users to read districts" ON districts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow anonymous to read districts" ON districts
  FOR SELECT
  TO anon
  USING (true);

-- Create updated_at trigger for clubs
CREATE OR REPLACE FUNCTION update_clubs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clubs_updated_at ON clubs;
CREATE TRIGGER update_clubs_updated_at
  BEFORE UPDATE ON clubs
  FOR EACH ROW
  EXECUTE FUNCTION update_clubs_updated_at();

-- Add club_id foreign key to matches table
-- This allows matches to reference a specific club while keeping location TEXT for custom venues
ALTER TABLE matches ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);

-- Create index for club_id lookups
CREATE INDEX IF NOT EXISTS idx_matches_club_id ON matches(club_id) WHERE club_id IS NOT NULL;

-- Helper function to generate slug from name
CREATE OR REPLACE FUNCTION generate_club_slug(club_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        translate(club_name, 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiioooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Insert some sample clubs for testing (Algarve region)
INSERT INTO clubs (name, slug, website, phone, address, city, district_id, postal_code, latitude, longitude, num_courts, court_type, amenities, source, verified) VALUES
  (
    'Algarve Tennis and Fitness Club',
    'algarve-tennis-and-fitness-club',
    'https://www.algarvetennisandfitness.com',
    '+351 289 393 993',
    'Vale do Lobo',
    'Almancil',
    'faro',
    '8135-864',
    37.0494,
    -8.0678,
    4,
    'outdoor',
    ARRAY['parking', 'pro_shop', 'cafe', 'locker_rooms', 'rental'],
    'manual',
    true
  ),
  (
    'The Campus',
    'the-campus',
    'https://www.thecampus.pt',
    '+351 289 381 220',
    'Estrada da Quinta do Lago',
    'Almancil',
    'faro',
    '8135-024',
    37.0352,
    -8.0245,
    6,
    'outdoor',
    ARRAY['parking', 'pro_shop', 'cafe', 'locker_rooms', 'rental', 'swimming_pool', 'gym'],
    'manual',
    true
  ),
  (
    'Vilamoura Padel Club',
    'vilamoura-padel-club',
    'https://www.vilamourapadelclub.com',
    '+351 289 310 180',
    'Av. do Parque',
    'Vilamoura',
    'faro',
    '8125-404',
    37.0767,
    -8.1167,
    8,
    'mixed',
    ARRAY['parking', 'pro_shop', 'cafe', 'locker_rooms', 'rental'],
    'manual',
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- View for clubs with district names (convenience)
CREATE OR REPLACE VIEW clubs_with_district AS
SELECT 
  c.*,
  d.name as district_name
FROM clubs c
LEFT JOIN districts d ON c.district_id = d.id
WHERE c.active = true
ORDER BY d.display_order, c.name;
