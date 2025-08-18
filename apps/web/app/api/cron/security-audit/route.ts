import { NextRequest, NextResponse } from 'next/server';
import { performSecurityAudit } from '@/lib/security/audit';
import { axiomLogger } from '@/lib/monitoring/axiom';
import { alertManager } from '@/lib/monitoring/alert-config';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      await axiomLogger.logSecurityEvent('unauthorized_cron_access', {
        path: '/api/cron/security-audit',
        ip: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      });
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Log audit start
    await axiomLogger.log('cron-jobs', 'security_audit_started', {
      timestamp: new Date().toISOString(),
      source: 'vercel-cron'
    });

    // Perform comprehensive security audit
    const auditResult = await performSecurityAudit();

    // Log audit results
    await axiomLogger.logSecurityEvent('automated_security_audit', {
      score: auditResult.score,
      grade: auditResult.grade,
      categories: Object.fromEntries(
        Object.entries(auditResult.categories).map(([key, cat]) => [
          key,
          { score: cat.score, maxScore: cat.maxScore, failedChecks: cat.checks.filter(c => !c.passed).length }
        ])
      ),
      recommendationCount: auditResult.recommendations.length,
      timestamp: new Date().toISOString()
    });

    // Alert on security score degradation
    if (auditResult.score < 85) {
      await alertManager.checkAlert('security_score_degradation', auditResult.score, {
        previousScore: 90, // Would store this in database in real implementation
        grade: auditResult.grade,
        criticalIssues: auditResult.recommendations.filter(r => r.priority === 'critical').length
      });
    }

    // Alert on critical security issues
    const criticalRecommendations = auditResult.recommendations.filter(r => r.priority === 'critical');
    if (criticalRecommendations.length > 0) {
      await alertManager.checkAlert('critical_security_issues', criticalRecommendations.length, {
        issues: criticalRecommendations.map(r => r.title)
      });
    }

    // Track security metrics
    await axiomLogger.logBusinessMetric('security_audit_score', auditResult.score, {
      grade: auditResult.grade,
      categories: auditResult.categories
    });

    return NextResponse.json({
      success: true,
      message: 'Security audit completed',
      audit: {
        score: auditResult.score,
        grade: auditResult.grade,
        summary: auditResult.summary,
        recommendationCount: auditResult.recommendations.length,
        criticalIssues: criticalRecommendations.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Security audit cron failed:', error);
    
    await axiomLogger.logError(error as Error, {
      operation: 'security-audit-cron',
      source: 'vercel-cron'
    });

    await alertManager.checkAlert('cron_job_failures', 1, {
      jobName: 'security-audit',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: 'Security audit failed'
    }, { status: 500 });
  }
}