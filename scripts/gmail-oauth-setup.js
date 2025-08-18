#!/usr/bin/env node

const express = require('express');
const { google } = require('googleapis');
const open = require('open');

// Gmail OAuth Setup Helper
// This script helps you get a refresh token for server-side Gmail access

console.log('🔐 Gmail OAuth Setup Helper');
console.log('This will help you get a refresh token for automated Gmail processing.\n');

// Check if CLIENT_ID and CLIENT_SECRET are provided
const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log('❌ Usage: node scripts/gmail-oauth-setup.js CLIENT_ID CLIENT_SECRET');
  console.log('');
  console.log('Example:');
  console.log('node scripts/gmail-oauth-setup.js \\');
  console.log('  "123456789-abc.apps.googleusercontent.com" \\');
  console.log('  "GOCSPX-your_client_secret"');
  console.log('');
  console.log('Get these values from:');
  console.log('https://console.cloud.google.com/apis/credentials');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:8080/oauth/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Generate the authorization URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent' // Force consent to get refresh token
});

console.log('🚀 Starting OAuth flow...');
console.log('📧 Scopes: Gmail read and modify access');
console.log('🔗 Redirect URI:', REDIRECT_URI);
console.log('');

// Create express server to handle the callback
const app = express();
let server;

app.get('/oauth/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.log('❌ OAuth error:', error);
    res.send('<h1>❌ OAuth Error</h1><p>Check the console for details.</p>');
    process.exit(1);
  }

  if (!code) {
    console.log('❌ No authorization code received');
    res.send('<h1>❌ No Code</h1><p>No authorization code was received.</p>');
    process.exit(1);
  }

  try {
    // Exchange code for tokens
    console.log('🔄 Exchanging authorization code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('✅ OAuth flow completed successfully!');
    console.log('');
    console.log('📋 Your Gmail API credentials:');
    console.log('═'.repeat(60));
    console.log('CLIENT_ID=' + CLIENT_ID);
    console.log('CLIENT_SECRET=' + CLIENT_SECRET);
    console.log('REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('═'.repeat(60));
    console.log('');
    console.log('🔧 Add these to your .env.local file:');
    console.log('');
    console.log('GOOGLE_CLIENT_ID=' + CLIENT_ID);
    console.log('GOOGLE_CLIENT_SECRET=' + CLIENT_SECRET);
    console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('');
    console.log('✅ Setup complete! You can close this tab and stop the script.');

    res.send(`
      <html>
        <head>
          <title>✅ Gmail OAuth Setup Complete</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; }
            .code { background: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; border-radius: 5px; font-family: monospace; }
            pre { margin: 0; white-space: pre-wrap; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✅ Gmail OAuth Setup Complete!</h1>
            <p>Your refresh token has been generated successfully.</p>
          </div>
          
          <h2>🔧 Add these to your .env.local file:</h2>
          <div class="code">
            <pre>GOOGLE_CLIENT_ID=${CLIENT_ID}
GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}
GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}</pre>
          </div>
          
          <p><strong>✅ You can now close this tab and stop the script (Ctrl+C).</strong></p>
        </body>
      </html>
    `);

    // Close server after a delay
    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 2000);

  } catch (error) {
    console.log('❌ Error exchanging code for tokens:', error.message);
    res.send('<h1>❌ Token Exchange Error</h1><p>Check the console for details.</p>');
    process.exit(1);
  }
});

// Start server and open browser
server = app.listen(8080, () => {
  console.log('🌐 OAuth server started on http://localhost:8080');
  console.log('🔗 Opening authorization URL in your browser...');
  console.log('');
  console.log('If the browser doesn\'t open automatically, visit:');
  console.log(authUrl);
  console.log('');
  
  // Open browser automatically
  open(authUrl).catch(() => {
    console.log('⚠️  Could not open browser automatically. Please open the URL manually.');
  });
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 OAuth setup cancelled.');
  server.close();
  process.exit(0);
});