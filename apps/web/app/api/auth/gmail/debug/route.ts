import { NextResponse } from 'next/server';

export async function GET() {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`;
  
  return NextResponse.json({
    message: 'Gmail OAuth Debug Info',
    environment: {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '***REDACTED***' : 'NOT SET',
    },
    computed: {
      redirectUri,
      expectedRedirectUri: 'http://localhost:3000/api/auth/gmail/callback'
    },
    instructions: {
      step1: 'Copy the redirectUri value above',
      step2: 'Go to https://console.cloud.google.com/',
      step3: 'Navigate to APIs & Services > Credentials',
      step4: 'Click on your OAuth 2.0 Client ID',
      step5: 'Add the EXACT redirectUri to Authorized redirect URIs',
      step6: 'Make sure there are no trailing slashes or extra spaces',
      step7: 'Save the changes'
    }
  });
}