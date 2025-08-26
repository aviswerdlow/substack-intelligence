import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Check if we're in build time
const isBuildTime = process.env.npm_lifecycle_event === 'build' || 
                    process.env.VERCEL === '1' || 
                    process.env.BUILDING === '1' ||
                    process.env.CI === 'true';

const ErrorReportSchema = z.object({
  type: z.string(),
  message: z.string().optional(),
  error: z.string().optional(),
  filename: z.string().optional(),
  lineno: z.number().optional(),
  colno: z.number().optional(),
  stack: z.string().optional(),
  userId: z.string().optional(),
  url: z.string(),
  timestamp: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  additionalContext: z.record(z.any()).optional()
});

export async function POST(request: NextRequest) {
  // Skip during build time
  if (isBuildTime) {
    return NextResponse.json({ 
      message: 'Build-time execution skipped',
      timestamp: new Date().toISOString()
    });
  }
  
  // Lazy load dependencies to avoid build-time validation
  const { axiomLogger } = await import('@/lib/monitoring/axiom');
  const { ServerErrorHandler } = await import('@/lib/monitoring/server-error-handler');
  
  try {
    const body = await request.json();
    const errorData = ErrorReportSchema.parse(body);

    // Create error object for better logging
    const error = new Error(errorData.message || errorData.error || 'Unknown client error');
    if (errorData.stack) {
      error.stack = errorData.stack;
    }

    // Extract URL info
    const url = new URL(errorData.url);
    
    // Enhanced context for client errors
    const context = {
      type: 'client_error',
      errorType: errorData.type,
      filename: errorData.filename,
      line: errorData.lineno,
      column: errorData.colno,
      userId: errorData.userId,
      path: url.pathname,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      severity: errorData.severity || 'medium',
      timestamp: errorData.timestamp,
      ...errorData.additionalContext
    };

    // Log client-side error with enhanced context
    await axiomLogger.logError(error, context);

    // Check if we need to alert on client errors
    if (errorData.severity === 'high' || errorData.severity === 'critical') {
      console.warn(`🚨 High-priority client error: ${error.message}`, {
        url: errorData.url,
        userId: errorData.userId,
        type: errorData.type
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Error logged successfully'
    });

  } catch (error) {
    console.error('Failed to log client error:', error);
    
    return ServerErrorHandler.handleError(error as Error, {
      apiRoute: '/api/monitoring/error',
      method: 'POST'
    });
  }
}