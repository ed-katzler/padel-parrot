-- Migration: Add trial support to premium subscription system
-- This updates the is_premium_user function to recognize 'trialing' status

-- Update the is_premium_user function to include trialing status
CREATE OR REPLACE FUNCTION is_premium_user(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM subscriptions 
        WHERE user_id = check_user_id 
        AND status IN ('active', 'trialing')
        AND (current_period_end IS NULL OR current_period_end > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add policy to allow users to insert their own subscription (for trial creation)
-- Note: The existing "System can manage subscriptions" policy with FOR ALL USING (true)
-- already allows this, but we add an explicit INSERT policy for clarity
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'subscriptions' 
        AND policyname = 'Users can create their own trial subscription'
    ) THEN
        CREATE POLICY "Users can create their own trial subscription" ON subscriptions
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
