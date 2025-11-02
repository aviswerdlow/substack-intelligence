import { NextRequest, NextResponse } from 'next/server';
import { getSecurityContext, SecurityContext, Permission, hasPermission, validateSessionSecurity, getSecurityHeaders } from './auth';
import { withRateLimit, getClientIdentifier, isIPBlocked } from './rate-limiting';
import { validateAgainstSQLInjection, sanitizeInput, detectSensitiveData } from './validation';
import { axiomLogger } from '../monitoring/axiom';
import { alertManager } from '../monitoring/alert-config';

export interface SecurityMiddlewareOptions {
  requireAuth?: boolean;
  requiredPermissions?: Permission[];
  rateLimitEndpoint?: string;
  skipCSRFCheck?: boolean;
  allowedMethods?: string[];
  sensitiveEndpoint?: boolean;
}

// Main security middleware
export async function withSecurity(
  request: NextRequest,
  options: SecurityMiddlewareOptions = {}
): Promise<{ response?: NextResponse; context?: SecurityContext }> {
  // Skip all security checks if disabled for development
  if (process.env.DISABLE_SECURITY_MIDDLEWARE === 'true') {
    return { context: undefined };
  }
  
  const startTime = Date.now();
  
  try {
    // 1. Basic request validation
    const basicValidation = await validateBasicRequest(request, options);
    if (basicValidation.response) {
      return { response: basicValidation.response };
    }

    // 2. Rate limiting
    const rateLimitResponse = await withRateLimit(request, options.rateLimitEndpoint);
    if (rateLimitResponse) {
      await logSecurityEvent('rate_limit_exceeded', request);
      return { response: rateLimitResponse as NextResponse };
    }

    // 3. IP blocking and geolocation checks
    const ipCheck = await validateIPAddress(request);
    if (ipCheck.response) {
      return { response: ipCheck.response };
    }

    // 4. Authentication and authorization
    let securityContext: SecurityContext | null = null;
    if (options.requireAuth) {
      const authResult = await validateAuthentication(request, options);
      if (authResult.response) {
        return { response: authResult.response };
      }
      securityContext = authResult.context!;
    }

    // 5. Input validation and sanitization
    if (request.method !== 'GET') {
      const inputValidation = await validateRequestInput(request);
      if (inputValidation.response) {
        return { response: inputValidation.response };
      }
    }

    // 6. Session security validation
    if (securityContext) {
      const sessionValidation = await validateSessionSecurity(securityContext, request);
      if (sessionValidation.action === 'deny') {
        await logSecurityEvent('session_security_failed', request, {
          reason: sessionValidation.reason,
          userId: securityContext.userId
        });
        return {
          response: new NextResponse(
            JSON.stringify({ error: 'Session security validation failed' }),
            { status: 401, headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() } }
          )
        };
      }
    }

    // 7. Log successful security validation
    await axiomLogger.logSecurityEvent('request_validated', {
      path: new URL(request.url).pathname,
      method: request.method,
      userId: securityContext?.userId,
      validationTime: Date.now() - startTime,
      ipAddress: getClientIdentifier(request)
    });

    return { context: securityContext || undefined };
    
  } catch (error) {
    console.error('Security middleware error:', error);
    
    await logSecurityEvent('middleware_error', request, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      response: new NextResponse(
        JSON.stringify({ error: 'Security validation failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() } }
      )
    };
  }
}

// Basic request validation
async function validateBasicRequest(
  request: NextRequest,
  options: SecurityMiddlewareOptions
): Promise<{ response?: NextResponse }> {
  // Method validation
  if (options.allowedMethods && !options.allowedMethods.includes(request.method)) {
    await logSecurityEvent('method_not_allowed', request);
    return {
      response: new NextResponse(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() } }
      )
    };
  }

  // Content-Type validation for non-GET requests
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {
        response: new NextResponse(
          JSON.stringify({ error: 'Invalid content type' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() } }
        )
      };
    }
  }

  // Request size validation
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    await logSecurityEvent('request_too_large', request);
    return {
      response: new NextResponse(
        JSON.stringify({ error: 'Request too large' }),
        { status: 413, headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() } }
      )
    };
  }

  return {};
}

// IP address validation
async function validateIPAddress(request: NextRequest): Promise<{ response?: NextResponse }> {
  const clientId = getClientIdentifier(request);
  const ipAddress = clientId.startsWith('ip:') ? clientId.slice(3) : 'unknown';

  // Check blocked IPs
  if (isIPBlocked(ipAddress)) {
    await logSecurityEvent('blocked_ip_attempt', request, { ipAddress });
    await alertManager.checkAlert('blocked_ip_count', 1, { ipAddress });
    
    return {
      response: new NextResponse(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() } }
      )
    };
  }

  return {};
}

// Authentication validation
async function validateAuthentication(
  request: NextRequest,
  options: SecurityMiddlewareOptions
): Promise<{ response?: NextResponse; context?: SecurityContext }> {
  const securityContext = await getSecurityContext(request);
  
  if (!securityContext) {
    await logSecurityEvent('authentication_failed', request);
    return {
      response: new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() } }
      )
    };
  }

  // Verify email verification for sensitive endpoints
  if (options.sensitiveEndpoint && !securityContext.isVerified) {
    await logSecurityEvent('unverified_sensitive_access', request, {
      userId: securityContext.userId
    });
    return {
      response: new NextResponse(
        JSON.stringify({ error: 'Email verification required for this operation' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() } }
      )
    };
  }

  // Permission validation
  if (options.requiredPermissions && options.requiredPermissions.length > 0) {
    const hasRequiredPermissions = options.requiredPermissions.every(
      permission => hasPermission(securityContext, permission)
    );

    if (!hasRequiredPermissions) {
      await logSecurityEvent('insufficient_permissions', request, {
        userId: securityContext.userId,
        requiredPermissions: options.requiredPermissions,
        userPermissions: securityContext.permissions
      });
      return {
        response: new NextResponse(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() } }
        )
      };
    }
  }

  return { context: securityContext };
}

// Request input validation
async function validateRequestInput(request: NextRequest): Promise<{ response?: NextResponse }> {
  try {
    const body = await request.clone().text();
    
    if (body) {
      // SQL injection detection
      if (!validateAgainstSQLInjection(body)) {
        await logSecurityEvent('sql_injection_attempt', request, { body: body.slice(0, 500) });
        await alertManager.checkAlert('security_attack_count', 1, { type: 'sql_injection' });
        
        return {
          response: new NextResponse(
            JSON.stringify({ error: 'Invalid input detected' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() } }
          )
        };
      }

      // Sensitive data detection
      if (detectSensitiveData(body)) {
        await logSecurityEvent('sensitive_data_detected', request, {
          path: new URL(request.url).pathname
        });
        // Don't block but log for monitoring
      }

      // XSS prevention
      if (containsXSSPatterns(body)) {
        await logSecurityEvent('xss_attempt', request, { body: body.slice(0, 500) });
        await alertManager.checkAlert('security_attack_count', 1, { type: 'xss' });
        
        return {
          response: new NextResponse(
            JSON.stringify({ error: 'Invalid input detected' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() } }
          )
        };
      }
    }

    return {};
  } catch (error) {
    // If we can't read the body, continue (might be binary data)
    return {};
  }
}

// XSS pattern detection
function containsXSSPatterns(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^>]*>/gi,
    /<link\b[^>]*>/gi,
    /<meta\b[^>]*>/gi
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

// Security event logging
async function logSecurityEvent(
  event: string,
  request: NextRequest,
  additionalData: Record<string, any> = {}
): Promise<void> {
  try {
    const url = new URL(request.url);
    
    await axiomLogger.logSecurityEvent(event, {
      path: url.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      clientId: getClientIdentifier(request),
      timestamp: new Date().toISOString(),
      ...additionalData
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// Helper function to create secure API route handler
export function withSecureRoute(
  handler: (request: NextRequest, context?: SecurityContext) => Promise<NextResponse>,
  options: SecurityMiddlewareOptions = {}
) {
  return async (request: NextRequest) => {
    const result = await withSecurity(request, options);
    
    if (result.response) {
      return result.response;
    }

    try {
      return await handler(request, result.context);
    } catch (error) {
      console.error('Secure route handler error:', error);
      
      await logSecurityEvent('handler_error', request, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...getSecurityHeaders() 
          } 
        }
      );
    }
  };
}

// Content Security Policy middleware
export function withCSP(response: NextResponse, nonce?: string): NextResponse {
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${nonce ? `'nonce-${nonce}'` : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.anthropic.com https://*.supabase.co wss:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ];

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  return response;
}

// CORS middleware for API routes
export function withCORS(response: NextResponse, allowedOrigins: string[] = []): NextResponse {
  const defaultOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'https://substack-intelligence.vercel.app'
  ];

  const origins = [...defaultOrigins, ...allowedOrigins];
  
  response.headers.set('Access-Control-Allow-Origin', origins[0]); // Set first origin
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}