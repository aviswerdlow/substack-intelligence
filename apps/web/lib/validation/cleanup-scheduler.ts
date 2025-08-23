import validationCache from './cache';
import debouncer from './debounce';
import performanceTracker from './performance-metrics';
import memoryMonitor from './memory-monitor';

export class CleanupScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly cleanupIntervalMs: number;
  private lastCleanup: Date | null = null;
  private cleanupStats = {
    totalRuns: 0,
    cacheEntriesCleaned: 0,
    debounceEntriesCleaned: 0,
    metricsEntriesCleaned: 0
  };

  constructor(cleanupIntervalMs: number = 5 * 60 * 1000) {
    this.cleanupIntervalMs = cleanupIntervalMs;
  }

  start(): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.performCleanup();
    }, this.cleanupIntervalMs);

    if (typeof this.intervalId.unref === 'function') {
      this.intervalId.unref();
    }

    this.performCleanup();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private performCleanup(): void {
    try {
      const cacheEntriesCleaned = validationCache.pruneOldEntries();
      const debounceEntriesCleaned = debouncer.cleanup();
      const metricsEntriesCleaned = performanceTracker.cleanup();

      this.cleanupStats.totalRuns++;
      this.cleanupStats.cacheEntriesCleaned += cacheEntriesCleaned;
      this.cleanupStats.debounceEntriesCleaned += debounceEntriesCleaned;
      this.cleanupStats.metricsEntriesCleaned += metricsEntriesCleaned;

      this.lastCleanup = new Date();

      if (cacheEntriesCleaned > 0 || debounceEntriesCleaned > 0 || metricsEntriesCleaned > 0) {
        console.log(`[Cleanup] Removed: ${cacheEntriesCleaned} cache entries, ${debounceEntriesCleaned} debounce entries, ${metricsEntriesCleaned} metric entries`);
      }

      const memStatus = memoryMonitor.getStatus();
      if (memStatus.status === 'critical') {
        console.warn('[Cleanup] Memory usage critical, forcing garbage collection if available');
        memoryMonitor.forceGarbageCollection();
      }
    } catch (error) {
      console.error('[Cleanup] Error during cleanup:', error);
    }
  }

  getStats() {
    return {
      ...this.cleanupStats,
      lastCleanup: this.lastCleanup,
      nextCleanup: this.lastCleanup 
        ? new Date(this.lastCleanup.getTime() + this.cleanupIntervalMs)
        : null,
      isRunning: this.intervalId !== null
    };
  }

  forceCleanup(): void {
    this.performCleanup();
  }
}

const globalCleanupScheduler = new CleanupScheduler();
globalCleanupScheduler.start();

export default globalCleanupScheduler;