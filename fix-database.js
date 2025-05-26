const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDatabase() {
  console.log('🔧 Fixing database authentication trigger...\n');

  try {
    console.log('📋 Please run the following SQL in your Supabase SQL Editor:');
    console.log('');
    console.log('----------------------------------------');
    console.log(`CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (id, phone)
    VALUES (NEW.id, NEW.phone)
    ON CONFLICT (phone) DO UPDATE SET
        id = NEW.id,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`);
    console.log('----------------------------------------');
    console.log('');
    console.log('📖 Instructions:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Click on "SQL Editor" in the left sidebar');
    console.log('3. Copy and paste the SQL above');
    console.log('4. Click "Run" to execute');
    console.log('');
    console.log('This will fix the authentication trigger to handle both login and signup properly.');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

fixDatabase(); 