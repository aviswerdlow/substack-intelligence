import { NextRequest, NextResponse } from 'next/server';
import { axiomLogger } from '@/lib/monitoring/axiom';
import { ServerErrorHandler } from '@/lib/monitoring/server-error-handler';
import { z } from 'zod';

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