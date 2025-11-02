import { NextRequest, NextResponse } from 'next/server';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

/**
 * Redirects authenticated users to the Gmail setup page
 * This endpoint is called after successful authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated via NextAuth
    const session = await getServerSecuritySession();

    if (!session) {
      // Redirect to sign-in if not authenticated
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // Redirect to Gmail setup page
    return NextResponse.redirect(new URL('/auth/gmail-setup', request.url));

  } catch (error) {
    console.error('Gmail connect redirect error:', error);
    // On error, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}