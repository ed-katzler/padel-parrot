const { createClient } = require('@supabase/supabase-js');

// Load environment variables from the web app
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, 'apps/web/.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  });
  
  return env;
}

async function applyFix() {
  console.log('🔧 Applying database authentication fix...\n');
  
  try {
    const env = loadEnvFile();
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase environment variables');
      return;
    }
    
    console.log('📋 You need to manually run this SQL in your Supabase Dashboard:');
    console.log('');
    console.log('🔗 Go to: https://lbozlqehmsyuoztpkhuf.supabase.co/project/default/sql');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('CREATE OR REPLACE FUNCTION handle_new_user()');
    console.log('RETURNS TRIGGER AS $$');
    console.log('BEGIN');
    console.log('    INSERT INTO users (id, phone)');
    console.log('    VALUES (NEW.id, NEW.phone)');
    console.log('    ON CONFLICT (phone) DO UPDATE SET');
    console.log('        id = NEW.id,');
    console.log('        updated_at = NOW();');
    console.log('    RETURN NEW;');
    console.log('END;');
    console.log('$$ LANGUAGE plpgsql SECURITY DEFINER;');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📝 Steps:');
    console.log('1. Click the link above to open Supabase SQL Editor');
    console.log('2. Copy and paste the SQL code between the lines');
    console.log('3. Click "Run" to execute');
    console.log('4. Come back here and press Enter when done');
    console.log('');
    
    // Wait for user input
    await new Promise((resolve) => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
    
    console.log('✅ Great! Now let\'s test the authentication...');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

if (require.main === module) {
  applyFix();
} 