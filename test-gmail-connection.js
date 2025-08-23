#!/usr/bin/env node

/**
 * Gmail Connection Test Script
 * Tests the Gmail connector initialization and connection
 */

console.log('🔍 Gmail Connection Test\n');

// Check environment variables first
console.log('📋 Environment Check:');
console.log('---------------------');

const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET', 
  'GOOGLE_REFRESH_TOKEN'
];

let missingVars = [];

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.includes('your-') || value === '') {
    console.log(`❌ ${varName}: Missing or placeholder`);
    missingVars.push(varName);
  } else {
    console.log(`✅ ${varName}: Configured`);
  }
});

if (missingVars.length > 0) {
  console.log('\n🚨 Gmail OAuth Setup Required');
  console.log('================================');
  console.log('Missing environment variables:', missingVars.join(', '));
  console.log('\nTo set up Gmail OAuth:');
  console.log('1. Follow the guide in apps/web/docs/GMAIL_SETUP.md');
  console.log('2. Run: node scripts/gmail-oauth-setup.js CLIENT_ID CLIENT_SECRET');
  console.log('3. Add the generated tokens to your .env.local file');
  console.log('4. Run this test again');
  process.exit(0);
}

// If all env vars are present, test the connection
console.log('\n🔧 Testing Gmail Connector Initialization...');

try {
  // Import the connector (this will test if dependencies are available)
  const { GmailConnector } = require('./services/ingestion/src/gmail-connector.ts');
  console.log('✅ GmailConnector class loaded successfully');
  
  // Try to create an instance
  const connector = new GmailConnector();
  console.log('✅ GmailConnector instance created successfully');
  
  // Test connection (this will make actual API call)
  console.log('\n🌐 Testing Gmail API Connection...');
  
  connector.testConnection()
    .then(isConnected => {
      if (isConnected) {
        console.log('✅ Gmail API connection successful!');
        console.log('\n📊 Fetching Gmail statistics...');
        
        return connector.getStats();
      } else {
        throw new Error('Gmail API connection failed');
      }
    })
    .then(stats => {
      console.log('✅ Gmail statistics retrieved successfully');
      console.log('📈 Statistics:', JSON.stringify(stats, null, 2));
      
      console.log('\n🎉 Gmail Integration Test: PASSED');
      console.log('Your Gmail connector is ready to fetch Substack emails!');
      
      console.log('\n🚀 Next Steps:');
      console.log('- Test email fetching: curl -X POST http://localhost:3000/api/test/gmail');
      console.log('- Run full pipeline: curl -X POST http://localhost:3000/api/trigger/intelligence');
    })
    .catch(error => {
      console.error('\n❌ Gmail connection test failed:', error.message);
      console.log('\n🔧 Troubleshooting Tips:');
      console.log('- Check your refresh token is valid');
      console.log('- Ensure Gmail API is enabled in Google Cloud Console');
      console.log('- Verify your OAuth credentials are correct');
      console.log('- Make sure aviswerdlow@gmail.com has access to the app');
    });
    
} catch (error) {
  console.error('❌ Failed to initialize Gmail connector:', error.message);
  
  if (error.message.includes('Cannot find module')) {
    console.log('\n🔧 Dependency Issue Detected');
    console.log('Try running: npm install');
    console.log('Then run this test again');
  } else {
    console.log('\n🔧 Configuration Issue:');
    console.log('Check your .env.local file for correct values');
  }
}