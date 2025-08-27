import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        hasGoogleOAuth: false 
      }, { status: 401 });
    }

    // Check if user has Google OAuth account connected through Clerk
    const hasGoogleOAuth = user.externalAccounts?.some(
      account => account.provider === 'google' || account.provider === 'oauth_google'
    ) || false;

    // Get the Google email if available
    const googleEmail = user.externalAccounts?.find(
      account => account.provider === 'google' || account.provider === 'oauth_google'
    )?.emailAddress || null;

    return NextResponse.json({
      hasGoogleOAuth,
      googleEmail,
      userId: user.id,
      primaryEmail: user.emailAddresses?.[0]?.emailAddress
    });
  } catch (error) {
    console.error('Error checking Clerk OAuth status:', error);
    return NextResponse.json({ 
      error: 'Failed to check OAuth status',
      hasGoogleOAuth: false 
    }, { status: 500 });
  }
}