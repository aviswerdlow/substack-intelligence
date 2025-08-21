#!/usr/bin/env node

const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function checkGmailAPI() {
  console.log('🔍 Gmail API Configuration Check');
  console.log('=================================\n');

  // Check environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  console.log('📋 Environment Variables:');
  console.log(`  Client ID: ${clientId ? '✅ Found' : '❌ Missing'}`);
  console.log(`  Client Secret: ${clientSecret ? '✅ Found' : '❌ Missing'}`);
  console.log(`  Refresh Token: ${refreshToken ? '✅ Found' : '❌ Missing'}`);
  
  if (clientId) {
    // Extract project ID from client ID
    const projectId = clientId.split('-')[0];
    console.log(`\n📦 Google Cloud Project ID: ${projectId}`);
    console.log(`  Full Client ID: ${clientId}`);
  }

  if (!clientId || !clientSecret || !refreshToken) {
    console.log('\n❌ Missing required credentials. Please check your .env.local file.');
    process.exit(1);
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:8080/oauth/callback'
  );

  // Set credentials
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  // Create Gmail client
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  console.log('\n🔄 Testing Gmail API connection...');
  
  try {
    // Try to get user profile
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    console.log('\n✅ Gmail API is working!');
    console.log(`  Email: ${profile.data.emailAddress}`);
    console.log(`  Total messages: ${profile.data.messagesTotal}`);
    console.log(`  Total threads: ${profile.data.threadsTotal}`);
    
    // Try to list labels as another test
    const labels = await gmail.users.labels.list({ userId: 'me' });
    console.log(`  Labels found: ${labels.data.labels.length}`);
    
    console.log('\n✅ All Gmail API tests passed successfully!');
    
  } catch (error) {
    console.log('\n❌ Gmail API Error:');
    console.log(`  Status: ${error.status || 'Unknown'}`);
    console.log(`  Message: ${error.message}`);
    
    if (error.message && error.message.includes('Gmail API has not been used')) {
      console.log('\n⚠️  The Gmail API is not enabled for your project!');
      console.log('\n📝 To fix this:');
      console.log('1. Click this link to enable the Gmail API:');
      
      const projectId = clientId.split('-')[0];
      console.log(`   https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=${projectId}`);
      
      console.log('\n2. Or manually:');
      console.log('   - Go to https://console.cloud.google.com/');
      console.log(`   - Select project ${projectId}`);
      console.log('   - Go to "APIs & Services" → "Library"');
      console.log('   - Search for "Gmail API"');
      console.log('   - Click "ENABLE"');
      console.log('\n3. Wait 2-3 minutes for the API to activate');
      console.log('4. Run this script again to verify');
    } else if (error.message && error.message.includes('invalid_grant')) {
      console.log('\n⚠️  Your refresh token is invalid or expired!');
      console.log('\n📝 To fix this:');
      console.log('1. Run: npm run setup:gmail-oauth');
      console.log('2. Re-authenticate with your Google account');
      console.log('3. Update the GOOGLE_REFRESH_TOKEN in .env.local');
    } else if (error.status === 403) {
      console.log('\n⚠️  Permission denied. Possible causes:');
      console.log('  - Gmail API not enabled');
      console.log('  - OAuth consent screen not configured');
      console.log('  - Scopes not properly set');
      console.log('  - Account restrictions');
    }
    
    // Show raw error for debugging
    if (error.errors && error.errors.length > 0) {
      console.log('\n📊 Detailed error info:');
      error.errors.forEach(err => {
        console.log(`  - ${err.message}`);
        if (err.extendedHelp) {
          console.log(`    Help: ${err.extendedHelp}`);
        }
      });
    }
  }

  console.log('\n=====================================');
  console.log('Check complete!');
}

// Run the check
checkGmailAPI().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});