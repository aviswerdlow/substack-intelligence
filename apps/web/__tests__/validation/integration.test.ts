import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import validationCache from '@/lib/validation/cache';
import debouncer from '@/lib/validation/debounce';
import memoryMonitor from '@/lib/validation/memory-monitor';
import performanceTracker from '@/lib/validation/performance-metrics';
import cleanupScheduler from '@/lib/validation/cleanup-scheduler';

describe('Validation System Integration', () => {
  beforeEach(() => {
    validationCache.clear();
    debouncer.resetUser('test-user');
    performanceTracker.clearMetrics();
    memoryMonitor.stop();
    cleanupScheduler.stop();
  });

  afterEach(() => {
    validationCache.clear();
    memoryMonitor.stop();
    cleanupScheduler.stop();
  });

  describe('Cache and Performance', () => {
    it('should cache validation results and track performance', async () => {
      const mockValidation = vi.fn().mockResolvedValue({ 
        overall: 'valid', 
        issues: [] 
      });

      const cacheKey = 'validation_test';
      
      const result1 = await validationCache.getOrFetch(
        cacheKey,
        async () => {
          const end = performanceTracker.startOperation('validation_test');
          const result = await mockValidation();
          end(true, { cached: false });
          return result;
        }
      );

      const result2 = await validationCache.getOrFetch(
        cacheKey,
        async () => {
          const end = performanceTracker.startOperation('validation_test');
          const result = await mockValidation();
          end(true, { cached: false });
          return result;
        }
      );

      expect(result1).toEqual(result2);
      expect(mockValidation).toHaveBeenCalledTimes(1);

      const stats = performanceTracker.getStats('validation_test');
      expect(stats?.totalOperations).toBe(1);
      expect(stats?.cacheHitRate).toBe(0);
    });

    it('should track cache hit performance separately', async () => {
      const mockValidation = vi.fn().mockResolvedValue({ 
        overall: 'valid', 
        issues: [] 
      });

      const cacheKey = 'validation_perf';
      
      await validationCache.getOrFetch(cacheKey, mockValidation);
      
      const end = performanceTracker.startOperation('validation_perf');
      const cached = validationCache.get(cacheKey);
      end(true, { cached: true });

      const stats = performanceTracker.getStats('validation_perf');
      expect(stats?.cacheHitRate).toBe(100);
    });
  });

  describe('Debouncing and Rate Limiting', () => {
    it('should prevent rapid validation requests', async () => {
      const user = 'rapid-user';
      
      const result1 = debouncer.shouldAllowRequest(user);
      expect(result1.allowed).toBe(true);

      const result2 = debouncer.shouldAllowRequest(user);
      expect(result2.allowed).toBe(false);
      expect(result2.waitMs).toBeGreaterThan(0);

      await new Promise(resolve => setTimeout(resolve, 1100));

      const result3 = debouncer.shouldAllowRequest(user);
      expect(result3.allowed).toBe(true);
    });

    it('should track debouncing in performance metrics', () => {
      const user = 'tracked-user';
      
      const end1 = performanceTracker.startOperation('validation_debounced');
      const check1 = debouncer.shouldAllowRequest(user);
      end1(check1.allowed);

      const end2 = performanceTracker.startOperation('validation_debounced');
      const check2 = debouncer.shouldAllowRequest(user);
      end2(check2.allowed);

      const stats = performanceTracker.getStats('validation_debounced');
      expect(stats?.totalOperations).toBe(2);
      expect(stats?.successRate).toBe(50);
    });
  });

  describe('Memory Monitoring', () => {
    it('should track memory usage without blocking', async () => {
      memoryMonitor.start();

      const startTime = Date.now();
      const status = memoryMonitor.getStatus();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10);
      expect(status.heapUsedMB).toBeGreaterThan(0);
      expect(status.status).toMatch(/healthy|warning|critical/);

      memoryMonitor.stop();
    });

    it('should provide historical memory data', async () => {
      memoryMonitor.start();

      await new Promise(resolve => setTimeout(resolve, 100));

      const readings = memoryMonitor.getReadings();
      expect(readings.length).toBeGreaterThan(0);
      
      const trend = memoryMonitor.getTrend();
      if (readings.length >= 2) {
        expect(trend).not.toBeNull();
      }

      memoryMonitor.stop();
    });
  });

  describe('Automatic Cleanup', () => {
    it('should clean up old cache entries', () => {
      validationCache.set('old-entry', { data: 'old' });
      
      cleanupScheduler.forceCleanup();
      
      const stats = cleanupScheduler.getStats();
      expect(stats.totalRuns).toBeGreaterThan(0);
    });

    it('should clean up debouncer entries', () => {
      debouncer.shouldAllowRequest('user1');
      debouncer.shouldAllowRequest('user2');
      
      cleanupScheduler.forceCleanup();
      
      const stats = cleanupScheduler.getStats();
      expect(stats.totalRuns).toBeGreaterThan(0);
    });

    it('should clean up old performance metrics', () => {
      const oldTimestamp = Date.now() - 10 * 60 * 1000;
      
      performanceTracker.recordMetric({
        operation: 'old-op',
        durationMs: 10,
        timestamp: oldTimestamp,
        success: true
      });

      cleanupScheduler.forceCleanup();
      
      const stats = performanceTracker.getStats('old-op');
      expect(stats).toBeNull();
    });
  });

  describe('Full Validation Flow', () => {
    it('should handle complete validation request with all optimizations', async () => {
      const userId = 'full-test-user';
      
      memoryMonitor.start();
      cleanupScheduler.start();

      const simulateValidation = async (type: string, bypassCache = false) => {
        const debounceCheck = debouncer.shouldAllowRequest(userId);
        
        if (!debounceCheck.allowed) {
          return { error: 'Rate limited', waitMs: debounceCheck.waitMs };
        }

        const cacheKey = `validation_${type}_${userId}`;
        const end = performanceTracker.startOperation(`validation_${type}`);

        try {
          const result = await validationCache.getOrFetch(
            cacheKey,
            async () => {
              await new Promise(resolve => setTimeout(resolve, 50));
              
              const memStatus = memoryMonitor.getStatus();
              
              return {
                overall: memStatus.status === 'critical' ? 'warning' : 'valid',
                category: type,
                issues: [],
                memory: {
                  heapUsedMB: memStatus.heapUsedMB,
                  trend: memStatus.trend
                }
              };
            },
            { bypassCache }
          );

          const cached = !bypassCache && validationCache.has(cacheKey);
          end(true, { cached });

          return { ...result, cached };
        } catch (error) {
          end(false);
          throw error;
        }
      };

      const result1 = await simulateValidation('runtime');
      expect(result1).not.toHaveProperty('error');
      expect(result1.cached).toBe(false);

      const result2 = await simulateValidation('runtime');
      expect(result2).not.toHaveProperty('error');
      expect(result2.cached).toBe(true);

      const result3 = await simulateValidation('runtime');
      expect(result3.error).toBe('Rate limited');

      await new Promise(resolve => setTimeout(resolve, 1100));

      const result4 = await simulateValidation('runtime', true);
      expect(result4).not.toHaveProperty('error');
      expect(result4.cached).toBe(false);

      const perfStats = performanceTracker.getStats('validation_runtime');
      expect(perfStats?.totalOperations).toBe(3);
      expect(perfStats?.successRate).toBe(100);
      expect(perfStats?.cacheHitRate).toBeGreaterThan(0);

      const cacheStats = validationCache.getStats();
      expect(cacheStats.hits).toBeGreaterThan(0);

      const debounceStats = debouncer.getStats();
      expect(debounceStats.activeUsers).toBe(1);
      expect(debounceStats.totalViolations).toBeGreaterThan(0);

      const memStatus = memoryMonitor.getStatus();
      expect(memStatus.heapUsedMB).toBeGreaterThan(0);

      memoryMonitor.stop();
      cleanupScheduler.stop();
    });
  });
});