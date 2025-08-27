import { NextRequest, NextResponse } from 'next/server';
import { currentUser, auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Get current auth status
    const { userId, sessionId } = auth();
    const user = await currentUser();
    
    // Try to list recent users
    let recentUsers;
    try {
      const users = await clerkClient.users.getUserList({
        limit: 10,
        orderBy: '-created_at'
      });
      recentUsers = users.map(u => ({
        id: u.id,
        email: u.emailAddresses?.[0]?.emailAddress || 'No email',
        createdAt: u.createdAt,
        firstName: u.firstName,
        lastName: u.lastName
      }));
    } catch (error) {
      recentUsers = 'Failed to fetch users: ' + (error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Get Clerk configuration
    const config = {
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 30) + '...',
      secretKeyPresent: !!process.env.CLERK_SECRET_KEY,
      signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
      afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
      afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
      domain: process.env.NEXT_PUBLIC_APP_URL,
    };
    
    return NextResponse.json({
      currentAuth: {
        userId,
        sessionId,
        userEmail: user?.emailAddresses?.[0]?.emailAddress,
        userName: user ? `${user.firstName} ${user.lastName}` : null
      },
      recentUsers,
      configuration: config,
      headers: {
        host: request.headers.get('host'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer')
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug endpoint error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Try to search for a user by email
    const body = await request.json();
    const searchTerm = body.email || body.search;
    
    if (!searchTerm) {
      return NextResponse.json({
        error: 'Please provide an email or search term in the request body'
      }, { status: 400 });
    }
    
    // Search for users
    const users = await clerkClient.users.getUserList({
      emailAddress: [searchTerm],
      limit: 10
    });
    
    const results = users.map(u => ({
      id: u.id,
      email: u.emailAddresses?.[0]?.emailAddress || 'No email',
      createdAt: u.createdAt,
      firstName: u.firstName,
      lastName: u.lastName,
      lastSignInAt: u.lastSignInAt
    }));
    
    return NextResponse.json({
      searchTerm,
      found: results.length,
      users: results
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Search error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}