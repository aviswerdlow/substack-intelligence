#!/usr/bin/env node

/**
 * OAuth Configuration Verification Script
 * Run this to verify your Google OAuth setup
 */

import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') });

const REQUIRED_VARS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NEXT_PUBLIC_APP_URL'
];

console.log('\n🔍 Verifying Google OAuth Configuration\n');
console.log('=' .repeat(50));

// Check environment variables
console.log('\n📋 Environment Variables Check:');
let hasErrors = false;

REQUIRED_VARS.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: MISSING`);
    hasErrors = true;
  } else {
    const displayValue = varName.includes('SECRET') 
      ? value.substring(0, 10) + '...' 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  }
});

// Validate Google Client ID format
if (process.env.GOOGLE_CLIENT_ID) {
  if (!process.env.GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')) {
    console.log('\n⚠️  Warning: GOOGLE_CLIENT_ID should end with .apps.googleusercontent.com');
    hasErrors = true;
  }
}

// Check redirect URI
if (process.env.NEXT_PUBLIC_APP_URL) {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`;
  console.log(`\n🔗 OAuth Redirect URI: ${redirectUri}`);
  console.log('   ➜ Add this exact URI to Google Cloud Console');
  
  if (process.env.NEXT_PUBLIC_APP_URL.includes('localhost') && process.env.NODE_ENV === 'production') {
    console.log('\n⚠️  Warning: Using localhost URL in production environment');
    hasErrors = true;
  }
}

// Instructions
console.log('\n' + '=' .repeat(50));
console.log('\n📝 Setup Instructions:\n');

if (hasErrors) {
  console.log('1. Set up OAuth 2.0 credentials in Google Cloud Console:');
  console.log('   https://console.cloud.google.com/apis/credentials\n');
  
  console.log('2. Add these Authorized JavaScript origins:');
  console.log('   - http://localhost:3000 (for local development)');
  console.log('   - https://your-app.vercel.app (for production)\n');
  
  console.log('3. Add these Authorized redirect URIs:');
  console.log('   - http://localhost:3000/api/auth/gmail/callback');
  console.log('   - https://your-app.vercel.app/api/auth/gmail/callback\n');
  
  console.log('4. Enable Gmail API:');
  console.log('   https://console.cloud.google.com/apis/library/gmail.googleapis.com\schaftupdated\n');
  
  console.log('5. Update environment variables in:');
  console.log('   - .env.local (for local development)');
  console.log('   - Vercel Dashboard (for production)');
} else {
  console.log('✅ OAuth configuration looks good!');
  console.log('\nMake sure you have added the redirect URI to Google Cloud Console:');
  console.log(`   ${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`);
}

console.log('\n' + '=' .repeat(50));
console.log('\n');

process.exit(hasErrors ? 1 : 0);