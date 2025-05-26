const { apiClient } = require('./../../packages/api-client/src/client.ts');

async function testApiClient() {
  console.log('Testing API Client...\n');
  
  try {
    // Test 1: Check connection
    console.log('1. Testing getMatches...');
    const { data: matches, error: matchesError } = await apiClient.getMatches();
    if (matchesError) {
      console.log('❌ Error:', matchesError);
    } else {
      console.log('✅ Success! Found', matches?.length || 0, 'matches');
      if (matches && matches.length > 0) {
        console.log('   First match:', {
          id: matches[0].id,
          title: matches[0].title,
          location: matches[0].location
        });
      }
    }
    
    // Test 2: Test user operations (without sending OTP)
    console.log('\n2. Testing getCurrentUser...');
    const { data: user, error: userError } = await apiClient.getCurrentUser();
    if (userError) {
      console.log('❌ Error (expected if not logged in):', userError);
    } else {
      console.log('✅ Success! Current user:', user);
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testApiClient(); 