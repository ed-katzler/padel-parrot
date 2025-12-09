-- Migration: Create rackets table for Racket Cube feature
-- Stores padel racket data with 3-axis classification (power, maneuverability, feel)

-- Create rackets table
CREATE TABLE IF NOT EXISTS rackets (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    image_url TEXT,
    
    -- The 3 axes (1-3 scale)
    -- X-axis: Power bias (1=Control, 2=Balanced, 3=Power)
    power_bias SMALLINT NOT NULL CHECK (power_bias BETWEEN 1 AND 3),
    -- Y-axis: Maneuverability/Weight (1=Light, 2=Medium, 3=Heavy)
    maneuverability SMALLINT NOT NULL CHECK (maneuverability BETWEEN 1 AND 3),
    -- Z-axis: Feel/Stiffness (1=Soft, 2=Medium, 3=Firm)
    feel SMALLINT NOT NULL CHECK (feel BETWEEN 1 AND 3),
    
    -- Raw technical data (optional, for future derivation)
    weight_grams INTEGER CHECK (weight_grams IS NULL OR weight_grams BETWEEN 300 AND 450),
    shape TEXT CHECK (shape IS NULL OR shape IN ('round', 'teardrop', 'diamond')),
    balance_mm INTEGER CHECK (balance_mm IS NULL OR balance_mm BETWEEN 200 AND 300),
    
    -- Marketing/UX fields
    headline TEXT,
    description TEXT,
    skill_level TEXT CHECK (skill_level IS NULL OR skill_level IN ('beginner', 'intermediate', 'advanced')),
    price_tier TEXT CHECK (price_tier IS NULL OR price_tier IN ('budget', 'mid', 'premium')),
    buy_url TEXT,  -- Affiliate link
    
    -- Metadata
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint on brand + model
    UNIQUE (brand, model)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_rackets_axes ON rackets (power_bias, maneuverability, feel);
CREATE INDEX IF NOT EXISTS idx_rackets_active ON rackets (active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_rackets_brand ON rackets (brand);

-- Enable RLS
ALTER TABLE rackets ENABLE ROW LEVEL SECURITY;

-- RLS policies: rackets are readable by authenticated users only
CREATE POLICY "Authenticated users can view active rackets"
    ON rackets
    FOR SELECT
    TO authenticated
    USING (active = true);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rackets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER rackets_updated_at
    BEFORE UPDATE ON rackets
    FOR EACH ROW
    EXECUTE FUNCTION update_rackets_updated_at();

-- Create a view for racket cell codes (computed, not stored)
-- Using SECURITY INVOKER to respect RLS policies of the querying user
CREATE OR REPLACE VIEW rackets_with_cell 
WITH (security_invoker = true)
AS
SELECT 
    *,
    'X' || power_bias || 'Y' || maneuverability || 'Z' || feel AS cell_code
FROM rackets
WHERE active = true;

-- Grant access to the view
GRANT SELECT ON rackets_with_cell TO authenticated;

-- Comments for documentation
COMMENT ON TABLE rackets IS 'Padel rackets with 3-axis classification for Racket Cube feature';
COMMENT ON COLUMN rackets.power_bias IS 'X-axis: 1=Control-focused, 2=Balanced, 3=Power-focused';
COMMENT ON COLUMN rackets.maneuverability IS 'Y-axis: 1=Light/Easy, 2=Medium, 3=Heavy/Stable';
COMMENT ON COLUMN rackets.feel IS 'Z-axis: 1=Soft/Forgiving, 2=Medium, 3=Firm/Precise';
