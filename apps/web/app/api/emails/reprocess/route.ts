import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

export async function POST(request: NextRequest) {
  try {
    const { emailIds } = await request.json();
    
    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid email IDs' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    
    // Update emails to pending status for reprocessing
    const { error } = await supabase
      .from('emails')
      .update({ 
        processing_status: 'pending',
        error_message: null,
        processed_at: null
      })
      .in('id', emailIds);

    if (error) {
      throw error;
    }

    // In a real implementation, this would trigger the processing pipeline
    // For now, we'll simulate it by setting them to processing after a short delay
    setTimeout(async () => {
      await supabase
        .from('emails')
        .update({ processing_status: 'processing' })
        .in('id', emailIds);
      
      // Simulate processing completion after 5 seconds
      setTimeout(async () => {
        await supabase
          .from('emails')
          .update({ 
            processing_status: 'completed',
            processed_at: new Date().toISOString()
          })
          .in('id', emailIds);
      }, 5000);
    }, 1000);

    return NextResponse.json({
      success: true,
      message: `${emailIds.length} email(s) queued for reprocessing`
    });

  } catch (error) {
    console.error('Failed to reprocess emails:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reprocess emails' },
      { status: 500 }
    );
  }
}