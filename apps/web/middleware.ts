import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

type RouteMatcher = (req: NextRequest) => boolean;

const AUTH_DEBUG_ENABLED = process.env.AUTH_DEBUG === 'true';
const authDebug = (...messages: unknown[]) => {
  if (AUTH_DEBUG_ENABLED) {
    console.log('[auth][middleware]', ...messages);
  }
};

const createRouteMatcher = (patterns: string[]): RouteMatcher => {
  const matchers = patterns.map(pattern => {
    const normalized = pattern
      .replace(/\//g, '\\/')
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\(\.\*\)/g, '.*');
    return new RegExp(`^${normalized}$`);
  });

  return (req: NextRequest) => {
    const pathname = req.nextUrl.pathname;
    return matchers.some(regex => regex.test(pathname));
  };
};

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in*',
  '/sign-up*',
  '/login',
  '/register',
  '/forgot-password',
  '/api/health',
  '/api/monitoring/*',
  '/api/analytics/*',
  '/api/test-metrics',
  '/api/test/*',
  '/api/emails/*',
  '/api/admin/*',
  '/api/setup/*',
  '/api/auth/gmail*',
  '/api/auth/_log',
  '/api/auth/*'
]);

/**
 * Enhanced security middleware with debug mode protection
 */
export async function middleware(req: NextRequest) {
  authDebug('Incoming request', {
    pathname: req.nextUrl.pathname,
    method: req.method,
    vercelEnv: process.env.VERCEL_ENV || 'local',
    nodeEnv: process.env.NODE_ENV
  });

  const securityResponse = applySecurityPolicies(req);
  if (securityResponse) {
    authDebug('Security policy intercepted request', {
      pathname: req.nextUrl.pathname
    });
    return securityResponse;
  }

  const isRoutePublic = isPublicRoute(req);
  authDebug('Route evaluation', {
    pathname: req.nextUrl.pathname,
    isPublic: isRoutePublic
  });

  if (!isRoutePublic) {
    const sessionCookie =
      req.cookies.get('__Secure-next-auth.session-token') ??
      req.cookies.get('next-auth.session-token');

    authDebug('Attempting to resolve token', {
      pathname: req.nextUrl.pathname,
      hasSessionCookie: Boolean(sessionCookie),
      cookieName: sessionCookie?.name
    });

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      authDebug('No session token found via getToken', {
        pathname: req.nextUrl.pathname,
        cookiePresent: Boolean(sessionCookie)
      });

      if (req.nextUrl.pathname.startsWith('/api')) {
        const response = NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication is required to access this resource.' },
          { status: 401 }
        );
        applySecurityHeaders(response, req);
        authDebug('Blocking API request due to missing authentication', {
          pathname: req.nextUrl.pathname,
          method: req.method
        });
        return response;
      }

      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      const response = NextResponse.redirect(signInUrl);
      applySecurityHeaders(response, req);
      authDebug('Redirecting browser to sign-in', {
        pathname: req.nextUrl.pathname,
        redirect: signInUrl.toString()
      });
      return response;
    }

    authDebug('Valid session token detected', {
      pathname: req.nextUrl.pathname,
      userId: token.sub,
      role: (token as { role?: string }).role,
      rememberMe: (token as { rememberMe?: boolean }).rememberMe
    });
  } else {
    authDebug('Public route bypass', {
      pathname: req.nextUrl.pathname
    });
  }

  const response = NextResponse.next();
  applySecurityHeaders(response, req);
  authDebug('Continuing request pipeline', {
    pathname: req.nextUrl.pathname
  });
  return response;
}

/**
 * Apply security policies including debug mode prevention
 */
function applySecurityPolicies(request: NextRequest): NextResponse | null {
  const isProduction = process.env.NODE_ENV === 'production';
  const vercelEnv = process.env.VERCEL_ENV;

  if ((isProduction || vercelEnv === 'production') && process.env.APP_DEBUG_MODE === 'true') {
    console.error('[SECURITY] DEBUG mode detected in production - BLOCKING REQUEST');

    logSecurityIncident({
      type: 'DEBUG_MODE_BLOCKED',
      environment: vercelEnv || 'production',
      timestamp: new Date().toISOString(),
      url: request.url,
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    const response = NextResponse.json(
      {
        error: 'Security Policy Violation',
        message: 'Debug mode cannot be enabled in production',
        code: 'SECURITY_DEBUG_MODE_BLOCKED'
      },
      { status: 403 }
    );
    applySecurityHeaders(response, request);
    return response;
  }

  if (vercelEnv === 'preview' && process.env.APP_DEBUG_MODE === 'true') {
    checkDebugModeTimeout();
  }

  return null;
}

/**
 * Check if debug mode should be auto-disabled in staging (1-hour timeout)
 */
function checkDebugModeTimeout() {
  const debugEnabledAt = process.env.APP_DEBUG_MODE_ENABLED_AT;
  if (debugEnabledAt) {
    const enabledTime = new Date(debugEnabledAt).getTime();
    const currentTime = new Date().getTime();
    const hourInMs = 60 * 60 * 1000;

    if (currentTime - enabledTime > hourInMs) {
      console.log('[SECURITY] Auto-disabling debug mode in staging (1-hour timeout)');

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
    console.log('[SECURITY] Debug mode detected in staging environment');
  }
}

/**
 * Apply comprehensive security headers
 */
function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const cspPolicy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    `connect-src 'self' ${appUrl} https://api.anthropic.com https://api.openai.com https://*.supabase.co https://*.inngest.net https://www.googleapis.com https://accounts.google.com`,
    "frame-src 'self' https://accounts.google.com",
    "worker-src 'self' blob:",
    isProduction ? 'upgrade-insecure-requests' : ''
  ]
    .filter(Boolean)
    .join('; ');

  const headers = {
    'Content-Security-Policy': cspPolicy,
    'X-XSS-Protection': '1; mode=block',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    ...(isProduction && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }),
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    ...(request.nextUrl.pathname.startsWith('/dashboard') && {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0'
    })
  } as Record<string, string>;

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

    if (process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET) {
      console.log('[MONITORING] Security incident logged:', incident.type);
    }
  } catch (error) {
    console.error('[ERROR] Failed to log security incident:', error);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)).*)',
    '/',
    '/(api|trpc)(.*)'
  ]
};
