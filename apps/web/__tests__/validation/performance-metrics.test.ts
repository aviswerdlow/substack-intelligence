import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceTracker } from '@/lib/validation/performance-metrics';

describe('PerformanceTracker', () => {
  let tracker: PerformanceTracker;

  beforeEach(() => {
    tracker = new PerformanceTracker(100, 5000);
  });

  describe('Operation tracking', () => {
    it('should track operation duration', () => {
      const end = tracker.startOperation('test-op');
      end(true, { test: 'metadata' });
      
      const stats = tracker.getStats('test-op');
      expect(stats).not.toBeNull();
      expect(stats?.totalOperations).toBe(1);
    });

    it('should measure async operations', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      
      const result = await tracker.measureAsync('async-op', fn, { key: 'value' });
      
      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
      
      const stats = tracker.getStats('async-op');
      expect(stats?.totalOperations).toBe(1);
    });

    it('should track failed operations', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('test error'));
      
      await expect(tracker.measureAsync('failed-op', fn)).rejects.toThrow('test error');
      
      const stats = tracker.getStats('failed-op');
      expect(stats?.successRate).toBe(0);
    });
  });

  describe('Performance statistics', () => {
    it('should calculate average duration', () => {
      for (let i = 0; i < 5; i++) {
        const end = tracker.startOperation('test-op');
        end(true);
      }
      
      const stats = tracker.getStats('test-op');
      expect(stats?.averageDurationMs).toBeGreaterThan(0);
    });

    it('should calculate percentiles', () => {
      for (let i = 0; i < 100; i++) {
        tracker.recordMetric({
          operation: 'test-op',
          durationMs: i,
          timestamp: Date.now(),
          success: true
        });
      }
      
      const stats = tracker.getStats('test-op');
      expect(stats?.p50Ms).toBeCloseTo(50, 1);
      expect(stats?.p95Ms).toBeCloseTo(95, 1);
      expect(stats?.p99Ms).toBeCloseTo(99, 1);
    });

    it('should calculate success rate', () => {
      for (let i = 0; i < 10; i++) {
        tracker.recordMetric({
          operation: 'test-op',
          durationMs: 10,
          timestamp: Date.now(),
          success: i < 7
        });
      }
      
      const stats = tracker.getStats('test-op');
      expect(stats?.successRate).toBe(70);
    });

    it('should calculate cache hit rate', () => {
      tracker.recordMetric({
        operation: 'test-op',
        durationMs: 10,
        timestamp: Date.now(),
        success: true,
        cached: true
      });
      
      tracker.recordMetric({
        operation: 'test-op',
        durationMs: 10,
        timestamp: Date.now(),
        success: true,
        cached: false
      });
      
      const stats = tracker.getStats('test-op');
      expect(stats?.cacheHitRate).toBe(50);
    });

    it('should calculate operations per minute', () => {
      for (let i = 0; i < 10; i++) {
        tracker.recordMetric({
          operation: 'test-op',
          durationMs: 10,
          timestamp: Date.now() - i * 1000,
          success: true
        });
      }
      
      const stats = tracker.getStats('test-op');
      expect(stats?.operationsPerMinute).toBeGreaterThan(0);
    });
  });

  describe('Slow operations', () => {
    it('should emit event for slow operations', (done) => {
      tracker.on('slow-operation', (metric) => {
        expect(metric.durationMs).toBeGreaterThan(1000);
        done();
      });

      tracker.recordMetric({
        operation: 'slow-op',
        durationMs: 1500,
        timestamp: Date.now(),
        success: true
      });
    });

    it('should track slow operations', () => {
      tracker.recordMetric({
        operation: 'slow-op-1',
        durationMs: 600,
        timestamp: Date.now(),
        success: true
      });

      tracker.recordMetric({
        operation: 'slow-op-2',
        durationMs: 800,
        timestamp: Date.now(),
        success: true
      });

      tracker.recordMetric({
        operation: 'fast-op',
        durationMs: 100,
        timestamp: Date.now(),
        success: true
      });

      const slowOps = tracker.getSlowOperations(500);
      expect(slowOps.length).toBe(2);
      expect(slowOps[0].durationMs).toBe(800);
    });
  });

  describe('Operation types', () => {
    it('should list all operation types', () => {
      tracker.recordMetric({
        operation: 'op1',
        durationMs: 10,
        timestamp: Date.now(),
        success: true
      });

      tracker.recordMetric({
        operation: 'op2',
        durationMs: 10,
        timestamp: Date.now(),
        success: true
      });

      tracker.recordMetric({
        operation: 'op1',
        durationMs: 10,
        timestamp: Date.now(),
        success: true
      });

      const types = tracker.getOperationTypes();
      expect(types).toContain('op1');
      expect(types).toContain('op2');
      expect(types.length).toBe(2);
    });
  });

  describe('Cleanup', () => {
    it('should clean up old metrics', () => {
      const oldTimestamp = Date.now() - 10000;
      
      tracker.recordMetric({
        operation: 'old-op',
        durationMs: 10,
        timestamp: oldTimestamp,
        success: true
      });

      tracker.recordMetric({
        operation: 'new-op',
        durationMs: 10,
        timestamp: Date.now(),
        success: true
      });

      const cleaned = tracker.cleanup();
      expect(cleaned).toBe(1);
      
      const stats = tracker.getStats();
      expect(stats?.totalOperations).toBe(1);
    });

    it('should clear all metrics', () => {
      for (let i = 0; i < 5; i++) {
        tracker.recordMetric({
          operation: 'test-op',
          durationMs: 10,
          timestamp: Date.now(),
          success: true
        });
      }

      tracker.clearMetrics();
      
      const stats = tracker.getStats();
      expect(stats).toBeNull();
    });
  });
});