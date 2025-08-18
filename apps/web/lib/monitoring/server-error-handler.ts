import { NextResponse } from 'next/server';
import { axiomLogger } from './axiom';
import { alertManager } from './alert-config';

export interface ErrorContext {
  userId?: string;
  organizationId?: string;
  url?: string;
  method?: string;
  userAgent?: string;
  requestId?: string;
  apiRoute?: string;
  [key: string]: any;
}

export class ServerErrorHandler {
  static async handleError(
    error: Error,
    context: ErrorContext = {}
  ): Promise<NextResponse> {
    const errorId = this.generateErrorId();
    
    console.error(`[${errorId}] Server Error:`, error);
    
    // Log to Axiom with structured data
    await axiomLogger.logError(error, {
      errorId,
      severity: this.getSeverity(error),
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      ...context
    });

    // Check if we need to send alerts
    await this.checkAndSendAlert(error, errorId, context);

    // Check alert conditions
    await this.checkAlertConditions(error, context);

    // Return appropriate response based on error type
    const statusCode = this.getStatusCode(error);
    const response = this.getErrorResponse(error, errorId, statusCode);

    return NextResponse.json(response, { status: statusCode });
  }

  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static getSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    // Database connection errors
    if (error.message.includes('database') || error.message.includes('connection')) {
      return 'critical';
    }
    
    // Authentication/authorization errors
    if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
      return 'high';
    }
    
    // External API errors
    if (error.message.includes('gmail') || error.message.includes('claude') || error.message.includes('fetch')) {
      return 'medium';
    }
    
    // Validation errors
    if (error.name === 'ZodError' || error.message.includes('validation')) {
      return 'low';
    }
    
    // Default to medium for unknown errors
    return 'medium';
  }

  private static getStatusCode(error: Error): number {
    if (error.message.includes('unauthorized')) return 401;
    if (error.message.includes('forbidden')) return 403;
    if (error.message.includes('not found')) return 404;
    if (error.message.includes('validation')) return 400;
    if (error.message.includes('rate limit')) return 429;
    
    return 500;
  }

  private static getErrorResponse(error: Error, errorId: string, statusCode: number) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return {
      success: false,
      error: {
        message: isDevelopment 
          ? error.message 
          : 'An internal server error occurred',
        errorId,
        timestamp: new Date().toISOString(),
        ...(isDevelopment && {
          stack: error.stack,
          name: error.name
        })
      }
    };
  }

  private static async checkAndSendAlert(
    error: Error, 
    errorId: string, 
    context: ErrorContext
  ): Promise<void> {
    const severity = this.getSeverity(error);
    
    // Only send alerts for high and critical errors
    if (severity === 'high' || severity === 'critical') {
      try {
        await this.sendAlert(error, errorId, severity, context);
      } catch (alertError) {
        console.error('Failed to send error alert:', alertError);
      }
    }
  }

  private static async sendAlert(
    error: Error,
    errorId: string,
    severity: 'high' | 'critical',
    context: ErrorContext
  ): Promise<void> {
    // Log alert to Axiom for tracking
    await axiomLogger.log('alerts', 'error_alert_sent', {
      errorId,
      severity,
      errorMessage: error.message,
      errorType: error.name,
      context,
      timestamp: new Date().toISOString()
    });

    // In a real implementation, you would integrate with:
    // - Slack webhooks
    // - PagerDuty
    // - Email notifications
    // - Discord webhooks
    // etc.
    
    console.log(`🚨 ALERT [${severity.toUpperCase()}]: ${error.message} (${errorId})`);
  }

  private static async checkAlertConditions(error: Error, context: ErrorContext): Promise<void> {
    const severity = this.getSeverity(error);

    // Check for critical errors
    if (severity === 'critical') {
      await alertManager.checkAlert('critical_error_count', 1, {
        errorMessage: error.message,
        errorType: error.name,
        ...context
      });
    }

    // Check for database errors
    if (error.message.includes('database') || error.message.includes('supabase')) {
      await alertManager.checkAlert('database_error_count', 1, {
        errorMessage: error.message,
        ...context
      });
    }

    // Check for API errors
    if (error.message.includes('gmail')) {
      await alertManager.checkAlert('gmail_api_error_count', 1, {
        errorMessage: error.message,
        ...context
      });
    }

    if (error.message.includes('claude') || error.message.includes('anthropic')) {
      await alertManager.checkAlert('claude_api_error_count', 1, {
        errorMessage: error.message,
        ...context
      });
    }
  }
}

// Wrapper function for API routes
export async function withErrorHandler(
  handler: () => Promise<NextResponse> | NextResponse,
  context: ErrorContext = {}
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    return await ServerErrorHandler.handleError(error as Error, context);
  }
}

// Middleware wrapper for catching unhandled errors
export function errorMiddleware(handler: Function) {
  return async function wrappedHandler(request: Request, ...args: any[]) {
    try {
      return await handler(request, ...args);
    } catch (error) {
      const context: ErrorContext = {
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('user-agent') || undefined
      };
      
      return await ServerErrorHandler.handleError(error as Error, context);
    }
  };
}