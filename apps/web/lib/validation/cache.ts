import { LRUCache } from 'lru-cache';

export interface CachedResult<T> {
  data: T;
  timestamp: number;
  hits: number;
}

export interface CacheOptions {
  maxSize?: number;
  ttlMs?: number;
  staleWhileRevalidate?: boolean;
}

export class ValidationCache<T> {
  private cache: LRUCache<string, CachedResult<T>>;
  private ttlMs: number;
  private staleWhileRevalidate: boolean;

  constructor(options: CacheOptions = {}) {
    const { maxSize = 100, ttlMs = 5 * 60 * 1000, staleWhileRevalidate = true } = options;
    
    this.ttlMs = ttlMs;
    this.staleWhileRevalidate = staleWhileRevalidate;
    
    this.cache = new LRUCache<string, CachedResult<T>>({
      max: maxSize,
      ttl: ttlMs,
      updateAgeOnGet: false,
      updateAgeOnHas: false,
      allowStale: staleWhileRevalidate,
    });
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      hits: 0
    });
  }

  get(key: string): T | undefined {
    const cached = this.cache.get(key);
    if (cached) {
      cached.hits++;
      return cached.data;
    }
    return undefined;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): {
    size: number;
    hits: number;
    misses: number;
    evictions: number;
  } {
    const calculatedStats = this.cache.calculatedSize || 0;
    return {
      size: this.cache.size,
      hits: Array.from(this.cache.values()).reduce((sum, item) => sum + item.hits, 0),
      misses: 0,
      evictions: calculatedStats
    };
  }

  isStale(key: string): boolean {
    const cached = this.cache.get(key, { allowStale: true });
    if (!cached) return true;
    
    const age = Date.now() - cached.timestamp;
    return age > this.ttlMs;
  }

  async getOrFetch(
    key: string,
    fetchFn: () => Promise<T>,
    options?: { bypassCache?: boolean }
  ): Promise<T> {
    if (!options?.bypassCache) {
      const cached = this.get(key);
      if (cached !== undefined) {
        if (this.staleWhileRevalidate && this.isStale(key)) {
          fetchFn().then(fresh => this.set(key, fresh)).catch(() => {});
        }
        return cached;
      }
    }

    const fresh = await fetchFn();
    this.set(key, fresh);
    return fresh;
  }

  pruneOldEntries(): number {
    const initialSize = this.cache.size;
    this.cache.purgeStale();
    return initialSize - this.cache.size;
  }
}

const globalValidationCache = new ValidationCache({
  maxSize: 50,
  ttlMs: 5 * 60 * 1000,
  staleWhileRevalidate: true
});

export default globalValidationCache;