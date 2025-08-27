import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

export async function GET() {
  try {
    // Get current user for filtering
    const user = await currentUser();
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!user && !isDevelopment) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    const userId = user?.id || 'development-user';
    const supabase = createServiceRoleClient();
    
    // Get counts for each status - FILTER BY USER_ID
    const { data: statusCounts } = await supabase
      .from('emails')
      .select('processing_status')
      .eq('user_id', userId);  // CRITICAL: Filter by user_id

    const stats = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      success_rate: 0
    };

    statusCounts?.forEach(item => {
      stats.total++;
      switch (item.processing_status) {
        case 'pending':
          stats.pending++;
          break;
        case 'processing':
          stats.processing++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'failed':
          stats.failed++;
          break;
      }
    });

    // Calculate success rate
    if (stats.total > 0) {
      stats.success_rate = (stats.completed / stats.total) * 100;
    }

    return NextResponse.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Failed to fetch email stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}