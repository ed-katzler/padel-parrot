-- Migration: Add premium subscription system tables
-- This enables the premium features including SMS notifications and weather forecasts

-- Create subscription status enum type
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing');
    END IF;
END $$;

-- Create notification type enum
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('day_before', 'ninety_min_before');
    END IF;
END $$;

-- Create notification log status enum
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_log_status') THEN
        CREATE TYPE notification_log_status AS ENUM ('sent', 'failed', 'skipped');
    END IF;
END $$;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status subscription_status DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    day_before_enabled BOOLEAN DEFAULT true,
    ninety_min_before_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification logs table (for tracking/debugging)
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    status notification_log_status NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_match ON notification_logs(match_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

-- Updated at triggers
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage subscriptions" ON subscriptions
    FOR ALL USING (true);

-- Notification preferences policies
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notification logs policies (read-only for users)
CREATE POLICY "Users can view their own notification logs" ON notification_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Helper function to check if a user has an active premium subscription
CREATE OR REPLACE FUNCTION is_premium_user(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM subscriptions 
        WHERE user_id = check_user_id 
        AND status = 'active'
        AND (current_period_end IS NULL OR current_period_end > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
