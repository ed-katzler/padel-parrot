-- Fix Row Level Security policies to allow user creation during authentication

-- Drop existing policies for users table
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create more permissive policies that allow user creation during auth
CREATE POLICY "Allow authenticated users to read users" ON users
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert themselves" ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow authenticated users to update themselves" ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Also allow the service role to manage users (for triggers)
CREATE POLICY "Allow service role full access to users" ON users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true); 