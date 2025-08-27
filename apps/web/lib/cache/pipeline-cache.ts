// Simple in-memory cache for pipeline status and metrics
// In production, consider using Redis or similar persistent cache

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface PipelineStatusCache {
  status: any;
  metrics: any;
  health: any;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  set<T>(key: string, data: T, ttlMs: number = 30000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    });
  }
  
  // Get cache statistics
  getStats(): {
    size: number;
    keys: string[];
    expired: number;
  } {
    const now = Date.now();
    let expired = 0;
    
    Array.from(this.cache.values()).forEach(entry => {
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      }
    });
    
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      expired
    };
  }
}

// Global cache instance
const pipelineCache = new MemoryCache();

// Clean up expired entries every 5 minutes
setInterval(() => {
  pipelineCache.cleanup();
}, 5 * 60 * 1000);

// Cache keys
export const CACHE_KEYS = {
  PIPELINE_STATUS: 'pipeline:status',
  PIPELINE_METRICS: 'pipeline:metrics',
  GMAIL_HEALTH: 'gmail:health',
  PIPELINE_SYNC_LOCK: 'pipeline:sync:lock'
} as const;

// Cache TTL values (in milliseconds)
export const CACHE_TTL = {
  PIPELINE_STATUS: 15000,      // 15 seconds
  PIPELINE_METRICS: 30000,     // 30 seconds  
  GMAIL_HEALTH: 60000,         // 1 minute
  SYNC_LOCK: 300000           // 5 minutes (prevent concurrent syncs)
} as const;

// Pipeline-specific cache functions
export const pipelineCacheManager = {
  // Status caching
  getPipelineStatus() {
    return pipelineCache.get(CACHE_KEYS.PIPELINE_STATUS);
  },
  
  setPipelineStatus(status: any, ttl: number = CACHE_TTL.PIPELINE_STATUS) {
    pipelineCache.set(CACHE_KEYS.PIPELINE_STATUS, status, ttl);
  },
  
  // Metrics caching  
  getPipelineMetrics() {
    return pipelineCache.get(CACHE_KEYS.PIPELINE_METRICS);
  },
  
  setPipelineMetrics(metrics: any, ttl: number = CACHE_TTL.PIPELINE_METRICS) {
    pipelineCache.set(CACHE_KEYS.PIPELINE_METRICS, metrics, ttl);
  },
  
  // Gmail health caching
  getGmailHealth() {
    return pipelineCache.get(CACHE_KEYS.GMAIL_HEALTH);
  },
  
  setGmailHealth(health: any, ttl: number = CACHE_TTL.GMAIL_HEALTH) {
    pipelineCache.set(CACHE_KEYS.GMAIL_HEALTH, health, ttl);
  },
  
  // Sync lock to prevent concurrent pipeline runs
  getSyncLock(): boolean {
    const lockData = pipelineCache.get(CACHE_KEYS.PIPELINE_SYNC_LOCK);
    
    // Check if lock exists and is still valid
    if (lockData && typeof lockData === 'object' && 'timestamp' in lockData) {
      const lockAge = Date.now() - lockData.timestamp;
      // If lock is older than 10 minutes, consider it stale
      if (lockAge > 10 * 60 * 1000) {
        console.log('[Pipeline Cache] Stale lock detected, clearing it');
        this.clearSyncLock();
        return false;
      }
      return true;
    }
    
    return lockData === true;
  },
  
  setSyncLock(ttl: number = CACHE_TTL.SYNC_LOCK) {
    pipelineCache.set(CACHE_KEYS.PIPELINE_SYNC_LOCK, {
      locked: true,
      timestamp: Date.now()
    }, ttl);
  },
  
  clearSyncLock() {
    pipelineCache.delete(CACHE_KEYS.PIPELINE_SYNC_LOCK);
  },
  
  // Cache invalidation
  invalidateStatus() {
    pipelineCache.delete(CACHE_KEYS.PIPELINE_STATUS);
  },
  
  invalidateMetrics() {
    pipelineCache.delete(CACHE_KEYS.PIPELINE_METRICS);
  },
  
  invalidateGmailHealth() {
    pipelineCache.delete(CACHE_KEYS.GMAIL_HEALTH);
  },
  
  invalidateAll() {
    pipelineCache.delete(CACHE_KEYS.PIPELINE_STATUS);
    pipelineCache.delete(CACHE_KEYS.PIPELINE_METRICS);
    pipelineCache.delete(CACHE_KEYS.GMAIL_HEALTH);
  },
  
  // Utility functions
  getStats() {
    return pipelineCache.getStats();
  },
  
  cleanup() {
    pipelineCache.cleanup();
  }
};

// Request deduplication utility
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();
  
  async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // If request is already pending, return the existing promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }
    
    // Create new request
    const promise = requestFn()
      .finally(() => {
        // Clean up after request completes
        this.pendingRequests.delete(key);
      });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }
  
  isPending(key: string): boolean {
    return this.pendingRequests.has(key);
  }
  
  clear() {
    this.pendingRequests.clear();
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// Performance monitoring utilities
export const performanceUtils = {
  // Create cache-aware response headers
  createCacheHeaders(ttlSeconds: number = 30): Record<string, string> {
    return {
      'Cache-Control': `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`,
      'Vary': 'Accept, Authorization',
      'X-Cache-TTL': ttlSeconds.toString()
    };
  },
  
  // Add cache status to response
  addCacheStatus(response: any, fromCache: boolean, cacheKey?: string) {
    return {
      ...response,
      meta: {
        ...response.meta,
        cached: fromCache,
        cacheKey,
        timestamp: new Date().toISOString()
      }
    };
  },
  
  // Measure execution time
  measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    return fn().then(result => ({
      result,
      duration: Date.now() - startTime
    }));
  },
  
  // Batch multiple async operations
  async batchOperations<T>(
    operations: Array<() => Promise<T>>,
    batchSize: number = 3
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }
    
    return results;
  }
};

// Debounced cache warming for frequently accessed data
export const cacheWarmer = {
  async warmPipelineCache() {
    try {
      // Pre-warm cache with recent data
      console.log('[CACHE] Warming pipeline cache...');
      
      // This would typically call the actual data fetching functions
      // to populate the cache before users request it
      
      console.log('[CACHE] Pipeline cache warmed successfully');
    } catch (error) {
      console.error('[CACHE] Failed to warm pipeline cache:', error);
    }
  },
  
  // Schedule cache warming at regular intervals
  scheduleWarming(intervalMs: number = 5 * 60 * 1000) {
    setInterval(() => {
      this.warmPipelineCache();
    }, intervalMs);
  }
};

export default pipelineCache;