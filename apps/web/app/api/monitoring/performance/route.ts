import { NextRequest, NextResponse } from 'next/server';
import { axiomLogger } from '@/lib/monitoring/axiom';
import { z } from 'zod';

const PerformanceMetricSchema = z.object({
  metric: z.string(),
  value: z.number(),
  userId: z.string().optional(),
  timestamp: z.string(),
  url: z.string()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const performanceData = PerformanceMetricSchema.parse(body);

    // Extract page information
    const url = new URL(performanceData.url);
    
    await axiomLogger.logPerformance(
      `client_${performanceData.metric.toLowerCase()}`,
      performanceData.value,
      {
        metric: performanceData.metric,
        userId: performanceData.userId,
        path: url.pathname,
        userAgent: request.headers.get('user-agent'),
        timestamp: performanceData.timestamp
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Performance metric tracked successfully'
    });

  } catch (error) {
    console.error('Failed to track performance metric:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to track performance metric'
    }, { status: 500 });
  }
}