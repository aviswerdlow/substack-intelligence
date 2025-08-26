import { EventEmitter } from 'events';

export interface PerformanceMetric {
  operation: string;
  durationMs: number;
  timestamp: number;
  success: boolean;
  cached?: boolean;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  totalOperations: number;
  averageDurationMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  successRate: number;
  cacheHitRate: number;
  operationsPerMinute: number;
}

export class PerformanceTracker extends EventEmitter {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics: number;
  private readonly windowMs: number;

  constructor(maxMetrics: number = 1000, windowMs: number = 5 * 60 * 1000) {
    super();
    this.maxMetrics = maxMetrics;
    this.windowMs = windowMs;
  }

  startOperation(operation: string): (success?: boolean, metadata?: Record<string, any>) => void {
    const startTime = performance.now();
    
    return (success: boolean = true, metadata?: Record<string, any>) => {
      const durationMs = performance.now() - startTime;
      this.recordMetric({
        operation,
        durationMs,
        timestamp: Date.now(),
        success,
        cached: metadata?.cached,
        metadata
      });
    };
  }

  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    let success = true;
    
    try {
      const result = await fn();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const durationMs = performance.now() - startTime;
      this.recordMetric({
        operation,
        durationMs,
        timestamp: Date.now(),
        success,
        metadata
      });
    }
  }

  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    this.emit('metric', metric);
    
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    if (metric.durationMs > 1000) {
      this.emit('slow-operation', metric);
    }
  }

  getStats(operation?: string): PerformanceStats | null {
    const now = Date.now();
    let relevantMetrics = this.metrics.filter(
      m => now - m.timestamp <= this.windowMs
    );

    if (operation) {
      relevantMetrics = relevantMetrics.filter(m => m.operation === operation);
    }

    if (relevantMetrics.length === 0) {
      return null;
    }

    const durations = relevantMetrics.map(m => m.durationMs).sort((a, b) => a - b);
    const totalOperations = relevantMetrics.length;
    const successCount = relevantMetrics.filter(m => m.success).length;
    const cacheHits = relevantMetrics.filter(m => m.cached === true).length;
    const cacheableOps = relevantMetrics.filter(m => m.cached !== undefined).length;

    const timeSpanMs = Math.min(
      this.windowMs,
      now - Math.min(...relevantMetrics.map(m => m.timestamp))
    );
    const operationsPerMinute = (totalOperations / (timeSpanMs / 60000));

    return {
      totalOperations,
      averageDurationMs: durations.reduce((sum, d) => sum + d, 0) / totalOperations,
      p50Ms: this.percentile(durations, 50),
      p95Ms: this.percentile(durations, 95),
      p99Ms: this.percentile(durations, 99),
      successRate: (successCount / totalOperations) * 100,
      cacheHitRate: cacheableOps > 0 ? (cacheHits / cacheableOps) * 100 : 0,
      operationsPerMinute: Math.round(operationsPerMinute * 100) / 100
    };
  }

  private percentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  getOperationTypes(): string[] {
    return [...new Set(this.metrics.map(m => m.operation))];
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  cleanup(): number {
    const now = Date.now();
    const initialSize = this.metrics.length;
    this.metrics = this.metrics.filter(m => now - m.timestamp <= this.windowMs);
    return initialSize - this.metrics.length;
  }

  getSlowOperations(thresholdMs: number = 500): PerformanceMetric[] {
    const now = Date.now();
    return this.metrics
      .filter(m => m.durationMs > thresholdMs && now - m.timestamp <= this.windowMs)
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 10);
  }
}

const globalPerformanceTracker = new PerformanceTracker();

export default globalPerformanceTracker;