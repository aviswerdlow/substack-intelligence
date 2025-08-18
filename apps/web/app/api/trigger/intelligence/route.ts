import { NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';

export async function POST() {
  try {
    // Trigger the manual intelligence workflow
    const result = await inngest.send({
      name: 'intelligence/manual-trigger',
      data: {
        triggeredBy: 'manual',
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        eventId: result.ids[0],
        message: 'Intelligence pipeline triggered successfully'
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Failed to trigger intelligence pipeline:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}