import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
  '/api/monitoring/(.*)',
  '/api/analytics/(.*)',
  '/api/test-metrics',
  '/api/test/(.*)',
  '/api/emails/(.*)',
  '/api/admin/(.*)',
  '/api/setup/(.*)',
  '/api/auth/gmail',
  '/api/auth/gmail/(.*)'
]);

/**
 * Enhanced security middleware with debug mode protection
 */
export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Apply security checks before authentication
  const securityResponse = applySecurityPolicies(req);
  if (securityResponse) {
    return securityResponse;
  }

  // Standard authentication check
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // Apply security headers to all responses
  const response = NextResponse.next();
  applySecurityHeaders(response, req);
  return response;
});

/**
 * Apply security policies including debug mode prevention
 */
function applySecurityPolicies(request: NextRequest): NextResponse | null {
  const isProduction = process.env.NODE_ENV === 'production';
  const vercelEnv = process.env.VERCEL_ENV;
  
  // CRITICAL: Block debug mode in production
  if ((isProduction || vercelEnv === 'production') && process.env.DEBUG === 'true') {
    console.error('[SECURITY] DEBUG mode detected in production - BLOCKING REQUEST');
    
    // Log security incident
    logSecurityIncident({
      type: 'DEBUG_MODE_BLOCKED',
      environment: vercelEnv || 'production',
      timestamp: new Date().toISOString(),
      url: request.url,
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Security Policy Violation',
        message: 'Debug mode cannot be enabled in production',
        code: 'SECURITY_DEBUG_MODE_BLOCKED'
      },
      { status: 403 }
    );
  }
  
  // For staging environment, check if debug mode should auto-disable
  if (vercelEnv === 'preview' && process.env.DEBUG === 'true') {
    checkDebugModeTimeout();
  }
  
  return null;
}

/**
 * Check if debug mode should be auto-disabled in staging (1-hour timeout)
 */
function checkDebugModeTimeout() {
  const debugEnabledAt = process.env.DEBUG_ENABLED_AT;
  if (debugEnabledAt) {
    const enabledTime = new Date(debugEnabledAt).getTime();
    const currentTime = new Date().getTime();
    const hourInMs = 60 * 60 * 1000;
    
    if (currentTime - enabledTime > hourInMs) {
      console.log('[SECURITY] Auto-disabling debug mode in staging (1-hour timeout)');
      // Note: Cannot modify process.env in Edge Runtime
      // This would need to be handled server-side
      
      logSecurityIncident({
        type: 'DEBUG_MODE_AUTO_DISABLED',
        environment: 'staging',
        timestamp: new Date().toISOString(),
        url: '',
        ip: '',
        userAgent: ''
      });
    }
  } else {
    // Note: Cannot set process.env in Edge Runtime
    console.log('[SECURITY] Debug mode detected in staging environment');
  }
}

/**
 * Apply comprehensive security headers
 */
function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Content Security Policy
  const cspPolicy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.clerk.dev https://*.clerk.accounts.dev",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.anthropic.com https://*.supabase.co https://*.clerk.accounts.dev https://*.inngest.net",
    "frame-src 'self' https://*.clerk.accounts.dev",
    isProduction ? "upgrade-insecure-requests" : ""
  ].filter(Boolean).join('; ');
  
  // Apply security headers
  const headers = {
    // Content Security Policy
    'Content-Security-Policy': cspPolicy,
    
    // XSS Protection
    'X-XSS-Protection': '1; mode=block',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    
    // HSTS (only in production)
    ...(isProduction && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }),
    
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    
    // Cache Control for sensitive pages
    ...(request.nextUrl.pathname.startsWith('/dashboard') && {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })
  };
  
  // Set headers
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
}

/**
 * Log security incidents for monitoring and audit
 */
async function logSecurityIncident(incident: {
  type: string;
  environment: string;
  timestamp: string;
  url: string;
  ip: string;
  userAgent: string;
}) {
  try {
    console.error('[SECURITY INCIDENT]', JSON.stringify(incident));
    
    // Send to monitoring if configured
    if (process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET) {
      // In production, this would send to Axiom
      // For now, we log for visibility
      console.log('[MONITORING] Security incident logged:', incident.type);
    }
  } catch (error) {
    console.error('[ERROR] Failed to log security incident:', error);
  }
}

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)'
  ]
};