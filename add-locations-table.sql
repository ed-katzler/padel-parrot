-- Create locations table for admin-managed venues
CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  address TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on locations table
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read locations (for autocomplete)
CREATE POLICY "Allow all users to read locations" ON locations
    FOR SELECT
    TO authenticated
    USING (true);

-- Only allow admin management (you can adjust this later)
-- For now, allow service role full access for admin operations
CREATE POLICY "Allow service role to manage locations" ON locations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add some sample locations
INSERT INTO locations (name, address, description) VALUES
('Padel Club London', '123 High Street, London SW1A 1AA', 'Premium indoor padel courts with parking'),
('South London Padel', '456 Park Road, London SE1 2AB', 'Outdoor courts with great facilities'),
('Westminster Padel Centre', '789 Victoria Street, London SW1E 5ND', 'Modern facility near Westminster'),
('Kings Cross Sports Club', '321 Euston Road, London N1C 4AG', 'Multi-sport facility with 4 padel courts'),
('Canary Wharf Padel', '654 Canary Wharf, London E14 5AB', 'Corporate padel facility with city views')
ON CONFLICT (name) DO NOTHING;

-- Create updated_at trigger for locations
CREATE OR REPLACE FUNCTION update_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_locations_updated_at(); 