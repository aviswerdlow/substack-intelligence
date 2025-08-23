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
      process.env.DEBUG = 'false';
      delete process.env.DEBUG_ENABLED_AT;
      
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
    // Set the timestamp when debug mode is first detected
    process.env.DEBUG_ENABLED_AT = new Date().toISOString();
  }
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
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)']
};