-- Fix the handle_new_user function to properly handle existing users
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