/**
 * Health Check Caching
 * 
 * Implements caching for health check results to prevent database overload
 * and improve response times for health endpoints
 */

interface CachedHealthCheck {
  timestamp: number;
  data: any;
  ttl: number;
}

class HealthCheckCache {
  private cache: Map<string, CachedHealthCheck> = new Map();
  private readonly DEFAULT_TTL = 30000; // 30 seconds default
  private readonly MIN_TTL = 5000; // 5 seconds minimum
  private readonly MAX_TTL = 300000; // 5 minutes maximum
  
  /**
   * Get cached health check result if still valid
   */
  get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    const now = Date.now();
    const age = now - cached.timestamp;
    
    if (age > cached.ttl) {
      // Cache expired
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  /**
   * Set health check result in cache
   */
  set(key: string, data: any, ttl?: number): void {
    const actualTtl = this.validateTtl(ttl);
    
    this.cache.set(key, {
      timestamp: Date.now(),
      data,
      ttl: actualTtl
    });
    
    // Clean up old entries periodically
    if (this.cache.size > 100) {
      this.cleanup();
    }
  }
  
  /**
   * Clear specific cache entry
   */
  clear(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    const stats = {
      totalEntries: this.cache.size,
      validEntries: 0,
      expiredEntries: 0,
      oldestEntry: null as number | null,
      newestEntry: null as number | null,
      averageAge: 0
    };
    
    let totalAge = 0;
    
    for (const [key, value] of entries) {
      const age = now - value.timestamp;
      
      if (age <= value.ttl) {
        stats.validEntries++;
      } else {
        stats.expiredEntries++;
      }
      
      totalAge += age;
      
      if (!stats.oldestEntry || value.timestamp < stats.oldestEntry) {
        stats.oldestEntry = value.timestamp;
      }
      
      if (!stats.newestEntry || value.timestamp > stats.newestEntry) {
        stats.newestEntry = value.timestamp;
      }
    }
    
    if (entries.length > 0) {
      stats.averageAge = Math.round(totalAge / entries.length);
    }
    
    return stats;
  }
  
  /**
   * Validate and normalize TTL value
   */
  private validateTtl(ttl?: number): number {
    if (!ttl) {
      return this.DEFAULT_TTL;
    }
    
    if (ttl < this.MIN_TTL) {
      return this.MIN_TTL;
    }
    
    if (ttl > this.MAX_TTL) {
      return this.MAX_TTL;
    }
    
    return ttl;
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, value] of this.cache.entries()) {
      const age = now - value.timestamp;
      if (age > value.ttl) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }
}

// Singleton instance
const healthCache = new HealthCheckCache();

/**
 * Cache decorator for async health check functions
 */
export function withHealthCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    keyGenerator?: (...args: Parameters<T>) => string;
    ttl?: number;
    skipCache?: boolean;
  }
): T {
  return (async (...args: Parameters<T>) => {
    // Skip caching if disabled
    if (options?.skipCache) {
      return fn(...args);
    }
    
    // Generate cache key
    const key = options?.keyGenerator 
      ? options.keyGenerator(...args)
      : `${fn.name || 'anonymous'}_${JSON.stringify(args)}`;
    
    // Check cache first
    const cached = healthCache.get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Execute function and cache result
    try {
      const result = await fn(...args);
      healthCache.set(key, result, options?.ttl);
      return result;
    } catch (error) {
      // Don't cache errors by default
      throw error;
    }
  }) as T;
}

/**
 * Get cache instance for direct manipulation
 */
export function getHealthCache() {
  return healthCache;
}

/**
 * Middleware to add cache headers based on health status
 */
export function getHealthCacheHeaders(status: 'healthy' | 'degraded' | 'unhealthy') {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store', // Default: don't cache
  };
  
  // Allow CDN caching for healthy responses
  if (status === 'healthy') {
    headers['Cache-Control'] = 'public, max-age=30, s-maxage=30, stale-while-revalidate=60';
    headers['CDN-Cache-Control'] = 'max-age=30';
  } else if (status === 'degraded') {
    // Short cache for degraded state
    headers['Cache-Control'] = 'public, max-age=10, s-maxage=10';
  }
  // Unhealthy responses should not be cached (default no-store)
  
  return headers;
}

/**
 * Cached database connectivity check
 */
export const cachedDatabaseCheck = withHealthCache(
  async () => {
    const { createServiceRoleClientSafe } = await import('@substack-intelligence/database');
    const supabase = createServiceRoleClientSafe();
    
    if (!supabase) {
      return {
        connected: false,
        error: 'Database client not configured'
      };
    }
    
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('count(*)')
        .limit(1);
      
      return {
        connected: !error,
        error: error?.message || null
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  {
    keyGenerator: () => 'database_connectivity',
    ttl: 15000 // 15 seconds for database checks
  }
);

export default healthCache;