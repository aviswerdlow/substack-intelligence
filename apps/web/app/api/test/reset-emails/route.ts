import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    const supabase = createServiceRoleClient();
    
    // Reset processing status for all emails from the past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data, error } = await supabase
      .from('emails')
      .update({ 
        processing_status: null
      })
      .gte('received_at', thirtyDaysAgo.toISOString())
      .select('id');
    
    if (error) {
      throw new Error(`Failed to reset emails: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        emailsReset: data?.length || 0
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    console.error('Failed to reset emails:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}