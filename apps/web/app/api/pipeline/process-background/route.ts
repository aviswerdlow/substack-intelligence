import { NextRequest, NextResponse } from 'next/server';
import { processBackgroundEmails } from './processor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { userId, batchSize = 10, maxProcessingTime } = await request.json();

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId is required'
      }, { status: 400 });
    }

    const result = await processBackgroundEmails({
      userId,
      batchSize,
      maxProcessingTime,
      logPrefix: '[Background API]'
    });

    return NextResponse.json({
      ...result,
      followUpTriggered: false
    });
  } catch (error) {
    console.error('[Background API] Background processing error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
