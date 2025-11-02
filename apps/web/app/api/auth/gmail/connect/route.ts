import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * Redirects authenticated users to the Gmail setup page
 * This endpoint is called after successful Clerk authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated with Clerk
    const { userId } = await auth();

    if (!userId) {
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