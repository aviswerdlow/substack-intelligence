import { NextRequest, NextResponse } from 'next/server';
import { withSecureRoute } from '@/lib/security/middleware';
import { Permission } from '@/lib/security/auth';
import validationCache from '@/lib/validation/cache';
import debouncer from '@/lib/validation/debounce';
import memoryMonitor from '@/lib/validation/memory-monitor';
import performanceTracker from '@/lib/validation/performance-metrics';
import cleanupScheduler from '@/lib/validation/cleanup-scheduler';

export const GET = withSecureRoute(
  async (request: NextRequest, context) => {
    if (!context || !context.permissions.includes(Permission.ADMIN_SYSTEM)) {
      return new NextResponse(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const memoryStatus = memoryMonitor.getStatus();
      const memoryReadings = memoryMonitor.getReadings();
      const cacheStats = validationCache.getStats();
      const debounceStats = debouncer.getStats();
      const cleanupStats = cleanupScheduler.getStats();
      
      const validationPerformance = {
        environment: performanceTracker.getStats('validation_environment'),
        secrets: performanceTracker.getStats('validation_secrets'),
        runtime: performanceTracker.getStats('validation_runtime'),
        full: performanceTracker.getStats('validation_full')
      };

      const slowOperations = performanceTracker.getSlowOperations(500);

      return NextResponse.json({
        success: true,
        stats: {
          memory: {
            current: memoryStatus,
            history: memoryReadings.map(r => ({
              timestamp: r.timestamp,
              heapUsedMB: Math.round(r.heapUsedMB * 100) / 100,
              heapTotalMB: Math.round(r.heapTotalMB * 100) / 100,
              rssMB: Math.round(r.rssMB * 100) / 100
            }))
          },
          cache: cacheStats,
          debounce: debounceStats,
          performance: {
            byOperation: validationPerformance,
            slowOperations: slowOperations.map(op => ({
              operation: op.operation,
              durationMs: Math.round(op.durationMs * 100) / 100,
              timestamp: op.timestamp,
              cached: op.cached
            }))
          },
          cleanup: cleanupStats
        },
        timestamp: new Date().toISOString()
      }, { status: 200 });

    } catch (error) {
      console.error('Failed to get validation stats:', error);
      
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Failed to retrieve statistics',
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
    rateLimitEndpoint: 'api/config/validate/stats'
  }
);