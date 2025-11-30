#!/usr/bin/env node

const https = require('https');
const http = require('http');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function checkUrl(url, description) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const startTime = Date.now();
    
    const req = protocol.get(url, { timeout: 10000 }, (res) => {
      const statusCode = res.statusCode;
      const responseTime = Date.now() - startTime;
      const headers = res.headers;
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const isSuccess = statusCode >= 200 && statusCode < 400;
        const size = Buffer.byteLength(data, 'utf8');
        
        resolve({
          url,
          description,
          status: isSuccess ? '✅ UP' : '❌ DOWN',
          statusCode,
          responseTime,
          size,
          server: headers.server || 'Unknown',
          cache: headers['x-vercel-cache'] || headers['cache-control'] || 'None',
          isSuccess,
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        url,
        description,
        status: '❌ ERROR',
        error: error.message,
        isSuccess: false,
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        description,
        status: '⏱️ TIMEOUT',
        error: 'Request timeout after 10s',
        isSuccess: false,
      });
    });
  });
}

async function checkProduction() {
  console.log('\n🦜 PadelParrot Production Status Check\n');
  console.log('=' .repeat(60));
  
  const urls = [
    { url: 'https://app.padelparrot.com', desc: 'Production App (Primary)' },
    { url: 'https://padelparrot.com', desc: 'Production Root Domain' },
    { url: 'https://staging.padelparrot.com', desc: 'Staging Environment' },
  ];
  
  const results = await Promise.all(urls.map(({ url, desc }) => checkUrl(url, desc)));
  
  console.log('\n📊 URL Status:\n');
  results.forEach((result) => {
    const statusColor = result.isSuccess ? colors.green : colors.red;
    console.log(`${statusColor}${result.status}${colors.reset} - ${result.description}`);
    console.log(`   URL: ${result.url}`);
    
    if (result.statusCode) {
      console.log(`   HTTP Status: ${result.statusCode}`);
    }
    
    if (result.responseTime) {
      const timeColor = result.responseTime < 500 ? colors.green : result.responseTime < 1000 ? colors.yellow : colors.red;
      console.log(`   Response Time: ${timeColor}${result.responseTime}ms${colors.reset}`);
    }
    
    if (result.size) {
      console.log(`   Response Size: ${(result.size / 1024).toFixed(2)} KB`);
    }
    
    if (result.server) {
      console.log(`   Server: ${result.server}`);
    }
    
    if (result.cache && result.cache !== 'None') {
      console.log(`   Cache: ${result.cache}`);
    }
    
    if (result.error) {
      console.log(`   ${colors.red}Error: ${result.error}${colors.reset}`);
    }
    
    console.log('');
  });
  
  // Summary
  const upCount = results.filter(r => r.isSuccess).length;
  const totalCount = results.length;
  
  console.log('=' .repeat(60));
  console.log(`\n📈 Summary: ${upCount}/${totalCount} URLs are accessible\n`);
  
  // Check if primary production URL is working
  const primaryResult = results.find(r => r.url === 'https://app.padelparrot.com');
  
  if (primaryResult && primaryResult.isSuccess) {
    console.log(`${colors.green}✅ Production app is UP and running!${colors.reset}`);
    console.log(`   Primary URL: ${primaryResult.url}`);
    console.log(`   Response Time: ${primaryResult.responseTime}ms`);
    console.log(`   Server: ${primaryResult.server}`);
    
    // Additional checks
    console.log(`\n${colors.cyan}🔍 Additional Checks:${colors.reset}`);
    
    // Check if it's a Next.js app
    if (primaryResult.server === 'Vercel' || primaryResult.cache.includes('HIT') || primaryResult.cache.includes('MISS')) {
      console.log(`${colors.green}✅ Deployed on Vercel${colors.reset}`);
    }
    
    // Check response time
    if (primaryResult.responseTime < 500) {
      console.log(`${colors.green}✅ Excellent response time (< 500ms)${colors.reset}`);
    } else if (primaryResult.responseTime < 1000) {
      console.log(`${colors.yellow}⚠️  Good response time (< 1s)${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️  Slow response time (> 1s)${colors.reset}`);
    }
    
  } else {
    console.log(`${colors.red}❌ Production app is DOWN or inaccessible${colors.reset}`);
    if (primaryResult && primaryResult.error) {
      console.log(`   Error: ${primaryResult.error}`);
    }
  }
  
  // Check other URLs
  const rootDomain = results.find(r => r.url === 'https://padelparrot.com');
  if (rootDomain && !rootDomain.isSuccess) {
    console.log(`\n${colors.yellow}⚠️  Root domain (padelparrot.com) is not configured${colors.reset}`);
    console.log(`   Consider setting up DNS to point to app.padelparrot.com`);
  }
  
  const staging = results.find(r => r.url === 'https://staging.padelparrot.com');
  if (staging && !staging.isSuccess) {
    console.log(`\n${colors.yellow}⚠️  Staging environment is not configured${colors.reset}`);
    console.log(`   This is optional - only needed if you want a separate staging environment`);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`\n${colors.cyan}💡 Next Steps:${colors.reset}`);
  console.log('   1. Test authentication flow on production');
  console.log('   2. Test match creation and joining');
  console.log('   3. Verify Supabase connection is working');
  console.log('   4. Check mobile responsiveness');
  console.log('   5. Monitor error logs in Vercel dashboard\n');
}

checkProduction().catch(console.error);

