import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    // Get counts for each status
    const { data: statusCounts } = await supabase
      .from('emails')
      .select('processing_status');

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
    if (stats.completed + stats.failed > 0) {
      stats.success_rate = stats.completed / (stats.completed + stats.failed);
    }

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Failed to fetch email stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch email stats' },
      { status: 500 }
    );
  }
}