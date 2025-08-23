import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryMonitor } from '@/lib/validation/memory-monitor';

describe('MemoryMonitor', () => {
  let monitor: MemoryMonitor;

  beforeEach(() => {
    monitor = new MemoryMonitor(5, 100, 400, 500);
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('Monitoring lifecycle', () => {
    it('should start monitoring', () => {
      monitor.start();
      const latest = monitor.getLatestReading();
      expect(latest).not.toBeNull();
      expect(latest?.heapUsedMB).toBeGreaterThan(0);
    });

    it('should stop monitoring', () => {
      monitor.start();
      monitor.stop();
      monitor.start();
    });

    it('should collect readings periodically', async () => {
      monitor.start();
      
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const readings = monitor.getReadings();
      expect(readings.length).toBeGreaterThanOrEqual(2);
    });

    it('should limit readings to maxReadings', async () => {
      monitor.start();
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const readings = monitor.getReadings();
      expect(readings.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Memory readings', () => {
    it('should provide latest reading', () => {
      monitor.start();
      const latest = monitor.getLatestReading();
      
      expect(latest).toHaveProperty('timestamp');
      expect(latest).toHaveProperty('heapUsedMB');
      expect(latest).toHaveProperty('heapTotalMB');
      expect(latest).toHaveProperty('rssMB');
      expect(latest).toHaveProperty('externalMB');
      expect(latest).toHaveProperty('arrayBuffersMB');
    });

    it('should provide all readings', () => {
      monitor.start();
      const readings = monitor.getReadings();
      
      expect(Array.isArray(readings)).toBe(true);
      expect(readings.length).toBeGreaterThan(0);
    });
  });

  describe('Memory trends', () => {
    it('should return null trend with insufficient data', () => {
      monitor.start();
      const trend = monitor.getTrend();
      expect(trend).toBeNull();
    });

    it('should calculate trend with sufficient data', async () => {
      monitor.start();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const trend = monitor.getTrend();
      expect(trend).not.toBeNull();
      expect(trend).toHaveProperty('increasing');
      expect(trend).toHaveProperty('averageMB');
      expect(trend).toHaveProperty('peakMB');
      expect(trend).toHaveProperty('currentMB');
      expect(trend).toHaveProperty('changeRate');
    });
  });

  describe('Threshold monitoring', () => {
    it('should emit warning event', (done) => {
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = () => ({
        ...originalMemoryUsage(),
        heapUsed: 450 * 1024 * 1024
      });

      monitor.on('warning', (data) => {
        expect(data.heapUsedMB).toBeGreaterThanOrEqual(400);
        expect(data.threshold).toBe(400);
        process.memoryUsage = originalMemoryUsage;
        done();
      });

      monitor.start();
    });

    it('should emit critical event', (done) => {
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = () => ({
        ...originalMemoryUsage(),
        heapUsed: 550 * 1024 * 1024
      });

      monitor.on('critical', (data) => {
        expect(data.heapUsedMB).toBeGreaterThanOrEqual(500);
        expect(data.threshold).toBe(500);
        process.memoryUsage = originalMemoryUsage;
        done();
      });

      monitor.start();
    });
  });

  describe('Status reporting', () => {
    it('should report healthy status', () => {
      monitor.start();
      const status = monitor.getStatus();
      
      expect(status.status).toMatch(/healthy|warning|critical/);
      expect(status.heapUsedMB).toBeGreaterThan(0);
      expect(status.heapPercentage).toBeGreaterThan(0);
    });

    it('should include trend in status', async () => {
      monitor.start();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const status = monitor.getStatus();
      expect(status.trend).not.toBeNull();
    });
  });

  describe('Garbage collection', () => {
    it('should attempt garbage collection if available', () => {
      const originalGc = global.gc;
      global.gc = vi.fn();
      
      monitor.forceGarbageCollection();
      
      if (global.gc) {
        expect(global.gc).toHaveBeenCalled();
      }
      
      global.gc = originalGc;
    });
  });
});