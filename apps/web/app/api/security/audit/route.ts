import { NextRequest, NextResponse } from 'next/server';
import { withSecureRoute } from '@/lib/security/middleware';
import { Permission } from '@/lib/security/auth';
import { performSecurityAudit, generateSecurityReport } from '@/lib/security/audit';

export const GET = withSecureRoute(
  async (request: NextRequest, context) => {
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