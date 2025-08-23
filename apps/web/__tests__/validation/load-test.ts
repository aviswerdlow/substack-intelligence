import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import validationCache from '@/lib/validation/cache';
import debouncer from '@/lib/validation/debounce';
import memoryMonitor from '@/lib/validation/memory-monitor';
import performanceTracker from '@/lib/validation/performance-metrics';

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  cachedRequests: number;
  throttledRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryPeak: number;
}

describe('Validation Load Testing', () => {
  beforeAll(() => {
    validationCache.clear();
    performanceTracker.clearMetrics();
    memoryMonitor.start();
  });

  afterAll(() => {
    memoryMonitor.stop();
  });

  const simulateValidationRequest = async (
    userId: string,
    validationType: string,
    simulateDelay: number = 10
  ): Promise<{
    success: boolean;
    cached: boolean;
    throttled: boolean;
    responseTime: number;
  }> => {
    const startTime = performance.now();
    
    const debounceCheck = debouncer.shouldAllowRequest(userId);
    
    if (!debounceCheck.allowed) {
      return {
        success: false,
        cached: false,
        throttled: true,
        responseTime: performance.now() - startTime
      };
    }

    const cacheKey = `load_test_${validationType}_${userId}`;
    
    try {
      const result = await validationCache.getOrFetch(
        cacheKey,
        async () => {
          await new Promise(resolve => setTimeout(resolve, simulateDelay));
          return {
            overall: 'valid',
            category: validationType,
            issues: [],
            timestamp: Date.now()
          };
        }
      );

      const cached = validationCache.has(cacheKey) && 
                    validationCache.get(cacheKey)?.timestamp === result.timestamp;

      return {
        success: true,
        cached,
        throttled: false,
        responseTime: performance.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        cached: false,
        throttled: false,
        responseTime: performance.now() - startTime
      };
    }
  };

  const runLoadTest = async (
    numUsers: number,
    requestsPerUser: number,
    concurrentRequests: number
  ): Promise<LoadTestResult> => {
    const memoryBefore = memoryMonitor.getStatus().heapUsedMB;
    let memoryPeak = memoryBefore;
    
    const results: Array<{
      success: boolean;
      cached: boolean;
      throttled: boolean;
      responseTime: number;
    }> = [];

    const users = Array.from({ length: numUsers }, (_, i) => `user_${i}`);
    const validationTypes = ['environment', 'secrets', 'runtime', 'full'];

    for (let round = 0; round < requestsPerUser; round++) {
      const roundPromises: Promise<any>[] = [];
      
      for (let i = 0; i < concurrentRequests && i < users.length; i++) {
        const userIndex = (round * concurrentRequests + i) % users.length;
        const userId = users[userIndex];
        const validationType = validationTypes[round % validationTypes.length];
        
        roundPromises.push(
          simulateValidationRequest(userId, validationType).then(result => {
            results.push(result);
            const currentMemory = memoryMonitor.getStatus().heapUsedMB;
            memoryPeak = Math.max(memoryPeak, currentMemory);
          })
        );
      }
      
      await Promise.all(roundPromises);
      
      if (round % 10 === 0 && round > 0) {
        await new Promise(resolve => setTimeout(resolve, 1100));
      } else {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    const memoryAfter = memoryMonitor.getStatus().heapUsedMB;

    const successfulRequests = results.filter(r => r.success).length;
    const cachedRequests = results.filter(r => r.cached).length;
    const throttledRequests = results.filter(r => r.throttled).length;
    
    const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    return {
      totalRequests: results.length,
      successfulRequests,
      cachedRequests,
      throttledRequests,
      averageResponseTime,
      p95ResponseTime: responseTimes[p95Index] || 0,
      p99ResponseTime: responseTimes[p99Index] || 0,
      memoryBefore,
      memoryAfter,
      memoryPeak
    };
  };

  describe('Performance under load', () => {
    it('should handle light load efficiently', async () => {
      const result = await runLoadTest(5, 10, 2);
      
      expect(result.successfulRequests).toBeGreaterThan(result.totalRequests * 0.8);
      expect(result.averageResponseTime).toBeLessThan(50);
      expect(result.cachedRequests).toBeGreaterThan(0);
      
      const memoryIncrease = result.memoryAfter - result.memoryBefore;
      expect(memoryIncrease).toBeLessThan(50);
    }, 30000);

    it('should benefit from caching under moderate load', async () => {
      validationCache.clear();
      
      const result = await runLoadTest(10, 20, 5);
      
      const cacheHitRate = (result.cachedRequests / result.successfulRequests) * 100;
      expect(cacheHitRate).toBeGreaterThan(30);
      
      expect(result.p95ResponseTime).toBeLessThan(100);
      expect(result.throttledRequests).toBeGreaterThan(0);
    }, 30000);

    it('should maintain stability under heavy load', async () => {
      validationCache.clear();
      
      const result = await runLoadTest(20, 30, 10);
      
      expect(result.successfulRequests).toBeGreaterThan(0);
      
      const memoryIncrease = result.memoryPeak - result.memoryBefore;
      expect(memoryIncrease).toBeLessThan(100);
      
      const stats = performanceTracker.getStats();
      expect(stats).not.toBeNull();
    }, 60000);
  });

  describe('Cache effectiveness', () => {
    it('should significantly reduce response time for cached requests', async () => {
      validationCache.clear();
      
      const userId = 'cache-test-user';
      const validationType = 'runtime';
      
      const firstRequest = await simulateValidationRequest(userId, validationType, 100);
      expect(firstRequest.cached).toBe(false);
      expect(firstRequest.responseTime).toBeGreaterThan(90);
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const secondRequest = await simulateValidationRequest(userId, validationType, 100);
      expect(secondRequest.cached).toBe(true);
      expect(secondRequest.responseTime).toBeLessThan(10);
      
      const speedup = firstRequest.responseTime / secondRequest.responseTime;
      expect(speedup).toBeGreaterThan(5);
    });
  });

  describe('Debouncing effectiveness', () => {
    it('should prevent request flooding from single user', async () => {
      const userId = 'flood-test-user';
      const results: boolean[] = [];
      
      for (let i = 0; i < 10; i++) {
        const check = debouncer.shouldAllowRequest(userId);
        results.push(check.allowed);
      }
      
      const allowedCount = results.filter(r => r).length;
      expect(allowedCount).toBe(1);
      
      const stats = debouncer.getStats();
      expect(stats.totalViolations).toBeGreaterThan(0);
    });

    it('should allow requests from different users', async () => {
      const results: boolean[] = [];
      
      for (let i = 0; i < 10; i++) {
        const userId = `distributed-user-${i}`;
        const check = debouncer.shouldAllowRequest(userId);
        results.push(check.allowed);
      }
      
      const allowedCount = results.filter(r => r).length;
      expect(allowedCount).toBe(10);
    });
  });

  describe('Memory management', () => {
    it('should maintain stable memory under sustained load', async () => {
      const readings: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        await runLoadTest(5, 10, 3);
        readings.push(memoryMonitor.getStatus().heapUsedMB);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const avgMemory = readings.reduce((sum, r) => sum + r, 0) / readings.length;
      const maxMemory = Math.max(...readings);
      const memoryVariation = maxMemory - avgMemory;
      
      expect(memoryVariation).toBeLessThan(50);
    }, 60000);

    it('should track memory trends accurately', async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const trend = memoryMonitor.getTrend();
      expect(trend).not.toBeNull();
      
      if (trend) {
        expect(trend.averageMB).toBeGreaterThan(0);
        expect(trend.peakMB).toBeGreaterThanOrEqual(trend.averageMB);
        expect(trend.currentMB).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance metrics accuracy', () => {
    it('should accurately track operation statistics', async () => {
      performanceTracker.clearMetrics();
      
      const operationName = 'test-validation';
      const durations: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        const duration = 10 + Math.random() * 90;
        durations.push(duration);
        
        performanceTracker.recordMetric({
          operation: operationName,
          durationMs: duration,
          timestamp: Date.now(),
          success: true,
          cached: i > 50
        });
      }
      
      const stats = performanceTracker.getStats(operationName);
      expect(stats).not.toBeNull();
      
      if (stats) {
        expect(stats.totalOperations).toBe(100);
        expect(stats.successRate).toBe(100);
        expect(stats.cacheHitRate).toBeCloseTo(49, 1);
        
        const sortedDurations = durations.sort((a, b) => a - b);
        const expectedP50 = sortedDurations[49];
        const expectedP95 = sortedDurations[94];
        
        expect(stats.p50Ms).toBeCloseTo(expectedP50, 1);
        expect(stats.p95Ms).toBeCloseTo(expectedP95, 1);
      }
    });
  });
});