import { NextRequest, NextResponse } from 'next/server';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';
import { axiomLogger } from './axiom';

// API request logging middleware
export function withApiLogging(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const start = Date.now();
    const session = await getServerSecuritySession();
    const userId = session?.user.id;
    
    // Extract request info
    const method = req.method;
    const path = new URL(req.url).pathname;
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    let response: NextResponse;
    let error: any;

    try {
      // Execute the handler
      response = await handler(req);
      
      // Log successful request
      const duration = Date.now() - start;
      await axiomLogger.logApiRequest(
        method,
        path,
        response.status,
        duration,
        userId || undefined
      );

      // Add performance headers
      response.headers.set('X-Response-Time', `${duration}ms`);
      
      return response;
    } catch (err) {
      error = err;
      const duration = Date.now() - start;
      
      // Log error
      await axiomLogger.logApiRequest(
        method,
        path,
        500,
        duration,
        userId || undefined,
        error
      );

      // Return error response
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Internal server error' 
        },
        { status: 500 }
      );
    }
  };
}

// Enhanced error boundary for API routes
export function withErrorTracking<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      const result = await fn(...args);
      
      // Log successful operation
      await axiomLogger.logAppEvent('operation_success', {
        operation,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      // Log error with context
      await axiomLogger.logError(error as Error, {
        operation,
        args: JSON.stringify(args, null, 2).slice(0, 1000), // Limit size
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  };
}