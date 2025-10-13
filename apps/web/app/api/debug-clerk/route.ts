import { NextRequest, NextResponse } from 'next/server';
import { currentUser, auth } from '@clerk/nextjs/server';
import { serverClerkClient } from '../../../lib/clerk-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Get current auth status
    const { userId, sessionId } = await auth();
    const user = await currentUser();
    
    // Try to list recent users
    let recentUsers;
    try {
      const clerk = serverClerkClient;
      const userList = await clerk.users.getUserList({
        limit: 10,
        orderBy: '-created_at'
      });
      recentUsers = userList.data.map(u => ({
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
    // Try to search for a user by email or domain
    const body = await request.json();
    const searchTerm = body.email || body.search || body.domain;
    
    if (!searchTerm) {
      return NextResponse.json({
        error: 'Please provide an email, domain, or search term in the request body'
      }, { status: 400 });
    }
    
    // Search for users - if it's a domain search (starts with @), get all users and filter
    let users;
    if (searchTerm.startsWith('@')) {
      // Domain search - get all users and filter
      const clerk = serverClerkClient;
      const userList = await clerk.users.getUserList({
        limit: 100,
        orderBy: '-created_at'
      });
      const domain = searchTerm.substring(1).toLowerCase();
      users = userList.data.filter(u => 
        u.emailAddresses?.some(email => 
          email.emailAddress?.toLowerCase().endsWith(`@${domain}`)
        )
      );
    } else {
      // Direct email search
      const clerk = serverClerkClient;
      const userList = await clerk.users.getUserList({
        emailAddress: [searchTerm],
        limit: 10
      });
      users = userList.data;
    }
    
    const results = users.map(u => ({
      id: u.id,
      email: u.emailAddresses?.[0]?.emailAddress || 'No email',
      createdAt: u.createdAt,
      firstName: u.firstName,
      lastName: u.lastName,
      lastSignInAt: u.lastSignInAt,
      allEmails: u.emailAddresses?.map(e => e.emailAddress) || []
    }));
    
    return NextResponse.json({
      searchTerm,
      searchType: searchTerm.startsWith('@') ? 'domain' : 'email',
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