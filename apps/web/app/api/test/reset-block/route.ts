import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    const supabase = createServiceRoleClient();
    
    // Reset processing status for Block email
    const { data, error } = await supabase
      .from('emails')
      .update({ 
        processing_status: null
      })
      .eq('id', '85da5baf-834e-464d-b878-bbddb259996c')  // Block's custom AI agent email ID
      .select('id, subject, newsletter_name');
    
    if (error) {
      throw new Error(`Failed to reset email: ${error.message}`);
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
    console.error('Failed to reset Block email:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}