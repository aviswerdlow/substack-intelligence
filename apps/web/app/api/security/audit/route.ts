import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Check if we're in build time
const isBuildTime = process.env.npm_lifecycle_event === 'build' || 
                    process.env.VERCEL === '1' || 
                    process.env.BUILDING === '1' ||
                    process.env.CI === 'true';

// Import dependencies conditionally to avoid build-time validation errors
let withSecureRoute: any;
let Permission: any;
let performSecurityAudit: any;
let generateSecurityReport: any;

if (!isBuildTime) {
  const securityMiddleware = require('@/lib/security/middleware');
  const auth = require('@/lib/security/auth');
  const audit = require('@/lib/security/audit');
  
  withSecureRoute = securityMiddleware.withSecureRoute;
  Permission = auth.Permission;
  performSecurityAudit = audit.performSecurityAudit;
  generateSecurityReport = audit.generateSecurityReport;
} else {
  // Provide mock implementations for build time
  withSecureRoute = (handler: any) => handler;
  Permission = { ADMIN_SYSTEM: 'admin_system' };
}

export const GET = withSecureRoute(
  async (request: NextRequest, context) => {
    // Skip during build time
    if (isBuildTime) {
      return NextResponse.json({ 
        message: 'Build-time execution skipped',
        timestamp: new Date().toISOString()
      });
    }
    
    // Only admins can perform security audits
    if (!context || !context.permissions.includes(Permission.ADMIN_SYSTEM)) {
      return new NextResponse(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const { searchParams } = new URL(request.url);
      const format = searchParams.get('format') || 'json';

      const auditResult = await performSecurityAudit();

      if (format === 'report') {
        const report = await generateSecurityReport();
        return new NextResponse(report, {
          status: 200,
          headers: {
            'Content-Type': 'text/markdown',
            'Content-Disposition': `attachment; filename="security-audit-${Date.now()}.md"`
          }
        });
      }

      return NextResponse.json({
        success: true,
        audit: auditResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Security audit failed:', error);
      
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Security audit failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
  {
    requireAuth: true,
    sensitiveEndpoint: true,
    allowedMethods: ['GET'],
    rateLimitEndpoint: 'api/security/audit'
  }
);