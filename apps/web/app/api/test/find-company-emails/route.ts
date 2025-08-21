import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    // Find emails likely to contain company mentions
    const { data: emails, error } = await supabase
      .from('emails')
      .select('id, subject, newsletter_name, processing_status')
      .or('subject.ilike.%Amplitude%,subject.ilike.%Block%,subject.ilike.%GPT%,subject.ilike.%AI%,subject.ilike.%startup%,subject.ilike.%founder%,subject.ilike.%CEO%,subject.ilike.%funding%,subject.ilike.%VC%,subject.ilike.%launch%,subject.ilike.%Spotify%,subject.ilike.%YouTube%,subject.ilike.%Tubi%,subject.ilike.%AppLovin%,subject.ilike.%Nielsen%')
      .order('received_at', { ascending: false })
      .limit(20);
    
    if (error) {
      throw new Error(`Failed to find emails: ${error.message}`);
    }
    
    // Reset these emails for processing
    if (emails && emails.length > 0) {
      const emailIds = emails.map(e => e.id);
      const { data: resetData, error: resetError } = await supabase
        .from('emails')
        .update({ processing_status: null })
        .in('id', emailIds)
        .select('id');
      
      if (resetError) {
        console.error('Failed to reset emails:', resetError);
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        totalFound: emails?.length || 0,
        emails: emails || []
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    console.error('Failed to find company emails:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}