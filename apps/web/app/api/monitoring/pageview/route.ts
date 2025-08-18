import { NextRequest, NextResponse } from 'next/server';
import { axiomLogger } from '@/lib/monitoring/axiom';
import { z } from 'zod';

const PageViewSchema = z.object({
  url: z.string(),
  userId: z.string().optional(),
  timestamp: z.string(),
  referrer: z.string().optional(),
  userAgent: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pageViewData = PageViewSchema.parse(body);

    // Extract page information
    const url = new URL(pageViewData.url);
    
    await axiomLogger.logUserActivity(
      pageViewData.userId || 'anonymous',
      'page_view',
      {
        path: url.pathname,
        search: url.search,
        host: url.host,
        referrer: pageViewData.referrer,
        userAgent: pageViewData.userAgent || request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        timestamp: pageViewData.timestamp
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Page view tracked successfully'
    });

  } catch (error) {
    console.error('Failed to track page view:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to track page view'
    }, { status: 500 });
  }
}