import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';
import { axiomLogger } from '@/lib/monitoring/axiom';
import { alertManager } from '@/lib/monitoring/alert-config';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      await axiomLogger.logSecurityEvent('unauthorized_cron_access', {
        path: '/api/cron/daily-intelligence',
        ip: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      });
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Log cron job execution
    await axiomLogger.log('cron-jobs', 'daily_intelligence_triggered', {
      timestamp: new Date().toISOString(),
      source: 'vercel-cron'
    });

    // Trigger the daily intelligence workflow
    await inngest.send({
      name: 'intelligence/daily-processing',
      data: {
        date: new Date().toISOString().split('T')[0],
        triggeredBy: 'cron',
        timestamp: Date.now()
      }
    });

    // Track successful execution
    await axiomLogger.logBusinessMetric('cron_job_executed', 1, {
      jobName: 'daily-intelligence',
      status: 'success'
    });

    return NextResponse.json({
      success: true,
      message: 'Daily intelligence processing triggered',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Daily intelligence cron failed:', error);
    
    await axiomLogger.logError(error as Error, {
      operation: 'daily-intelligence-cron',
      source: 'vercel-cron'
    });

    await alertManager.checkAlert('cron_job_failures', 1, {
      jobName: 'daily-intelligence',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: 'Cron execution failed'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Support both GET and POST for flexibility
  return GET(request);
}