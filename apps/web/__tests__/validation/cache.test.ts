import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ValidationCache } from '@/lib/validation/cache';

describe('ValidationCache', () => {
  let cache: ValidationCache<any>;

  beforeEach(() => {
    cache = new ValidationCache({
      maxSize: 10,
      ttlMs: 1000,
      staleWhileRevalidate: true
    });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', { data: 'test' });
      const result = cache.get('key1');
      expect(result).toEqual({ data: 'test' });
    });

    it('should return undefined for non-existent keys', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('key1', { data: 'test' });
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete specific keys', () => {
      cache.set('key1', { data: 'test' });
      cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', { data: 'test1' });
      cache.set('key2', { data: 'test2' });
      cache.clear();
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('TTL behavior', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', { data: 'test' });
      expect(cache.get('key1')).toEqual({ data: 'test' });
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should detect stale entries', async () => {
      cache.set('key1', { data: 'test' });
      expect(cache.isStale('key1')).toBe(false);
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(cache.isStale('key1')).toBe(true);
    });
  });

  describe('getOrFetch', () => {
    it('should return cached value if available', async () => {
      cache.set('key1', { data: 'cached' });
      const fetchFn = vi.fn().mockResolvedValue({ data: 'fresh' });
      
      const result = await cache.getOrFetch('key1', fetchFn);
      
      expect(result).toEqual({ data: 'cached' });
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch and cache if not available', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'fresh' });
      
      const result = await cache.getOrFetch('key1', fetchFn);
      
      expect(result).toEqual({ data: 'fresh' });
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(cache.get('key1')).toEqual({ data: 'fresh' });
    });

    it('should bypass cache when requested', async () => {
      cache.set('key1', { data: 'cached' });
      const fetchFn = vi.fn().mockResolvedValue({ data: 'fresh' });
      
      const result = await cache.getOrFetch('key1', fetchFn, { bypassCache: true });
      
      expect(result).toEqual({ data: 'fresh' });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should revalidate stale entries in background', async () => {
      cache.set('key1', { data: 'cached' });
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const fetchFn = vi.fn().mockResolvedValue({ data: 'fresh' });
      const result = await cache.getOrFetch('key1', fetchFn);
      
      expect(result).toEqual({ data: 'cached' });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Statistics', () => {
    it('should track cache hits', () => {
      cache.set('key1', { data: 'test' });
      cache.get('key1');
      cache.get('key1');
      cache.get('key1');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
    });

    it('should track cache size', () => {
      cache.set('key1', { data: 'test1' });
      cache.set('key2', { data: 'test2' });
      cache.set('key3', { data: 'test3' });
      
      const stats = cache.getStats();
      expect(stats.size).toBe(3);
    });
  });

  describe('Cleanup', () => {
    it('should prune old entries', async () => {
      cache.set('key1', { data: 'test1' });
      cache.set('key2', { data: 'test2' });
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      cache.set('key3', { data: 'test3' });
      
      const pruned = cache.pruneOldEntries();
      expect(pruned).toBeGreaterThanOrEqual(2);
      expect(cache.has('key3')).toBe(true);
    });
  });
});