import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { axiomLogger } from '@/lib/monitoring/axiom';
import { alertManager } from '@/lib/monitoring/alert-config';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      await axiomLogger.logSecurityEvent('unauthorized_cron_access', {
        path: '/api/cron/cleanup',
        ip: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      });
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const cleanupResults = {
      oldEmails: 0,
      orphanedCompanies: 0,
      oldLogs: 0,
      tempFiles: 0
    };

    // Log cleanup start
    await axiomLogger.log('cron-jobs', 'cleanup_started', {
      timestamp: new Date().toISOString(),
      source: 'vercel-cron'
    });

    // 1. Clean up old emails (older than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const { count: deletedEmails } = await supabase
      .from('emails')
      .delete()
      .lt('received_at', oneYearAgo.toISOString())
      .select();
    
    cleanupResults.oldEmails = deletedEmails || 0;

    // 2. Clean up orphaned companies (no mentions in last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const { count: deletedCompanies } = await supabase
      .from('companies')
      .delete()
      .not('id', 'in', `(
        SELECT DISTINCT company_id 
        FROM company_mentions 
        WHERE created_at > '${sixMonthsAgo.toISOString()}'
      )`)
      .select();
    
    cleanupResults.orphanedCompanies = deletedCompanies || 0;

    // 3. Clean up old company mentions (older than 2 years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    await supabase
      .from('company_mentions')
      .delete()
      .lt('created_at', twoYearsAgo.toISOString());

    // 4. Update statistics (removed RPC call - not implemented)

    // Log cleanup results
    await axiomLogger.log('cron-jobs', 'cleanup_completed', {
      timestamp: new Date().toISOString(),
      results: cleanupResults,
      stats
    });

    // Track metrics
    await axiomLogger.logBusinessMetric('database_cleanup_executed', 1, cleanupResults);

    // Alert if cleanup removed too much data (potential issue)
    if (cleanupResults.oldEmails > 10000 || cleanupResults.orphanedCompanies > 1000) {
      await alertManager.checkAlert('excessive_data_cleanup', 1, cleanupResults);
    }

    return NextResponse.json({
      success: true,
      message: 'Database cleanup completed',
      results: cleanupResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database cleanup cron failed:', error);
    
    await axiomLogger.logError(error as Error, {
      operation: 'database-cleanup-cron',
      source: 'vercel-cron'
    });

    await alertManager.checkAlert('cron_job_failures', 1, {
      jobName: 'database-cleanup',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: 'Database cleanup failed'
    }, { status: 500 });
  }
}