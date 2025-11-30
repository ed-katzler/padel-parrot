#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  cyan: '\x1b[36m',
};

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  return {
    name: description,
    path: filePath,
    exists,
    status: exists ? '✅ EXISTS' : '❌ MISSING'
  };
}

function checkEnvVar(filePath, varName, description) {
  if (!fs.existsSync(filePath)) {
    return {
      name: description,
      configured: false,
      status: '❌ FILE NOT FOUND'
    };
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const hasVar = content.includes(varName);
  const isConfigured = hasVar && !content.includes(`YOUR-${varName}`) && !content.includes('your-');
  
  return {
    name: description,
    configured: isConfigured,
    status: isConfigured ? '✅ CONFIGURED' : hasVar ? '⚠️  PLACEHOLDER' : '❌ MISSING'
  };
}

function checkProduction() {
  return new Promise((resolve) => {
    https.get('https://app.padelparrot.com', { timeout: 5000 }, (res) => {
      resolve({
        status: '✅ UP',
        statusCode: res.statusCode,
        server: res.headers.server || 'Unknown'
      });
    }).on('error', () => {
      resolve({
        status: '❌ DOWN',
        error: 'Connection failed'
      });
    }).on('timeout', () => {
      resolve({
        status: '⏱️ TIMEOUT',
        error: 'Request timeout'
      });
    });
  });
}

async function checkAppStatus() {
  console.log('\n🦜 PadelParrot App Status Check\n');
  console.log('='.repeat(60));
  
  const projectRoot = path.resolve(__dirname, '../');
  const webAppRoot = path.join(projectRoot, 'apps/web');
  
  // Check files
  console.log('\n📁 File Status:\n');
  const files = [
    checkFile(path.join(projectRoot, 'package.json'), 'Root package.json'),
    checkFile(path.join(webAppRoot, 'package.json'), 'Web app package.json'),
    checkFile(path.join(webAppRoot, '.env.local'), 'Local environment file'),
    checkFile(path.join(projectRoot, 'supabase/complete-setup.sql'), 'Database setup script'),
    checkFile(path.join(projectRoot, 'SUPABASE_NEW_PROJECT_SETUP.md'), 'Setup guide'),
  ];
  
  files.forEach(file => {
    const color = file.exists ? colors.green : colors.red;
    console.log(`${color}${file.status}${colors.reset} - ${file.name}`);
  });
  
  // Check environment variables
  console.log('\n🔐 Environment Configuration:\n');
  const envFile = path.join(webAppRoot, '.env.local');
  const envVars = [
    checkEnvVar(envFile, 'NEXT_PUBLIC_SUPABASE_URL', 'Supabase URL'),
    checkEnvVar(envFile, 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase Anon Key'),
    checkEnvVar(envFile, 'NEXT_PUBLIC_APP_URL', 'App URL'),
  ];
  
  envVars.forEach(env => {
    let color = colors.green;
    if (env.status.includes('❌')) color = colors.red;
    else if (env.status.includes('⚠️')) color = colors.yellow;
    console.log(`${color}${env.status}${colors.reset} - ${env.name}`);
  });
  
  // Check production
  console.log('\n🌐 Production Status:\n');
  const prodStatus = await checkProduction();
  const prodColor = prodStatus.status.includes('✅') ? colors.green : colors.red;
  console.log(`${prodColor}${prodStatus.status}${colors.reset} - Production App`);
  if (prodStatus.statusCode) {
    console.log(`   HTTP Status: ${prodStatus.statusCode}`);
    console.log(`   Server: ${prodStatus.server}`);
  }
  if (prodStatus.error) {
    console.log(`   ${colors.red}Error: ${prodStatus.error}${colors.reset}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  const filesOk = files.filter(f => f.exists).length;
  const envOk = envVars.filter(e => e.configured).length;
  const prodOk = prodStatus.status.includes('✅');
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files: ${filesOk}/${files.length} found`);
  console.log(`   Environment: ${envOk}/${envVars.length} configured`);
  console.log(`   Production: ${prodOk ? '✅ UP' : '❌ DOWN'}`);
  
  // Recommendations
  console.log('\n💡 Recommendations:\n');
  
  if (!fs.existsSync(envFile)) {
    console.log(`${colors.yellow}⚠️  Create .env.local file${colors.reset}`);
    console.log(`   Copy env.example to apps/web/.env.local`);
    console.log(`   Update with your Supabase credentials`);
  } else {
    const content = fs.readFileSync(envFile, 'utf8');
    if (content.includes('YOUR-') || content.includes('your-')) {
      console.log(`${colors.yellow}⚠️  Update environment variables${colors.reset}`);
      console.log(`   Replace placeholder values in apps/web/.env.local`);
    }
  }
  
  if (!prodOk) {
    console.log(`${colors.yellow}⚠️  Production app is down${colors.reset}`);
    console.log(`   Check Vercel dashboard for deployment status`);
  }
  
  console.log(`\n${colors.cyan}📚 Setup Guides:${colors.reset}`);
  console.log(`   - New Supabase project: SUPABASE_QUICK_START.md`);
  console.log(`   - Full setup: SUPABASE_NEW_PROJECT_SETUP.md`);
  console.log(`   - Deployment: DEPLOYMENT_CHECKLIST.md\n`);
}

checkAppStatus().catch(console.error);


