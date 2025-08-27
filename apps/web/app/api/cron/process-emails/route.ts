import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Cron job to process pending emails for all users
// Runs every minute via vercel.json configuration
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron job request (Vercel adds a special header)
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    // In production, verify the cron secret
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = createServiceRoleClient();
    
    // Find users with pending emails
    const { data: usersWithPending, error: queryError } = await supabase
      .from('emails')
      .select('user_id')
      .eq('extraction_status', 'pending')
      .not('user_id', 'is', null)
      .limit(10); // Process up to 10 users per cron run
    
    if (queryError) {
      console.error('Failed to find users with pending emails:', queryError);
      return NextResponse.json({
        success: false,
        error: 'Failed to query pending emails'
      }, { status: 500 });
    }
    
    if (!usersWithPending || usersWithPending.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending emails to process',
        processedUsers: 0
      });
    }
    
    // Get unique user IDs
    const uniqueUserIds = Array.from(new Set(usersWithPending.map(u => u.user_id)));
    console.log(`Found ${uniqueUserIds.length} users with pending emails`);
    
    const results = [];
    
    // Process emails for each user
    for (const userId of uniqueUserIds) {
      if (!userId) continue;
      
      try {
        // Call the background processing endpoint
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/pipeline/process-background`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              batchSize: 5 // Process 5 emails per user in this cron run
            })
          }
        );
        
        const result = await response.json();
        results.push({
          userId,
          success: result.success,
          processed: result.processed,
          remaining: result.remaining
        });
        
        console.log(`Processed ${result.processed} emails for user ${userId}, ${result.remaining} remaining`);
        
      } catch (error) {
        console.error(`Failed to process emails for user ${userId}:`, error);
        results.push({
          userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Summary statistics
    const totalProcessed = results.reduce((sum, r) => sum + (r.processed || 0), 0);
    const successfulUsers = results.filter(r => r.success).length;
    
    console.log(`Cron job complete: Processed ${totalProcessed} emails for ${successfulUsers}/${uniqueUserIds.length} users`);
    
    return NextResponse.json({
      success: true,
      message: `Processed ${totalProcessed} emails for ${successfulUsers} users`,
      processedUsers: successfulUsers,
      totalUsers: uniqueUserIds.length,
      results
    });
    
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}