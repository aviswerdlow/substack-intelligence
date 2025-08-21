import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    const supabase = createServiceRoleClient();
    
    // Reset processing status for Lenny's Newsletter emails
    const { data, error } = await supabase
      .from('emails')
      .update({ 
        processing_status: null
      })
      .like('newsletter_name', '%Lenny%')
      .select('id, subject, newsletter_name');
    
    if (error) {
      throw new Error(`Failed to reset emails: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        emailsReset: data?.length || 0,
        emails: data
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    console.error('Failed to reset Lenny emails:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}