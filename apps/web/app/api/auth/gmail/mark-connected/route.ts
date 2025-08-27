import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    const { email } = await request.json();

    // Mark user as having Gmail connected in the database
    const supabase = createServiceRoleClient();
    
    // Store a simple flag that Gmail is connected via Clerk OAuth
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        gmail_connected: true,
        gmail_email: email,
        gmail_tokens: {
          // Store a marker that we're using Clerk OAuth
          useClerkOAuth: true,
          connectedAt: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Failed to mark Gmail as connected:', error);
      return NextResponse.json({ 
        error: 'Failed to save connection status' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Gmail connection marked as active'
    });
  } catch (error) {
    console.error('Error marking Gmail as connected:', error);
    return NextResponse.json({ 
      error: 'Failed to mark Gmail as connected' 
    }, { status: 500 });
  }
}