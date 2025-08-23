import { describe, it, expect, beforeEach } from 'vitest';
import { RequestDebouncer } from '@/lib/validation/debounce';

describe('RequestDebouncer', () => {
  let debouncer: RequestDebouncer;

  beforeEach(() => {
    debouncer = new RequestDebouncer(100, 3, 1000);
  });

  describe('Request throttling', () => {
    it('should allow first request', () => {
      const result = debouncer.shouldAllowRequest('user1');
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should block rapid requests', () => {
      debouncer.shouldAllowRequest('user1');
      const result = debouncer.shouldAllowRequest('user1');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('too soon');
      expect(result.waitMs).toBeGreaterThan(0);
    });

    it('should allow requests after minimum interval', async () => {
      debouncer.shouldAllowRequest('user1');
      await new Promise(resolve => setTimeout(resolve, 110));
      
      const result = debouncer.shouldAllowRequest('user1');
      expect(result.allowed).toBe(true);
    });

    it('should track violations', () => {
      debouncer.shouldAllowRequest('user1');
      
      let result;
      for (let i = 0; i < 3; i++) {
        result = debouncer.shouldAllowRequest('user1');
      }
      
      expect(result!.violations).toBe(3);
    });

    it('should block after max violations', () => {
      debouncer.shouldAllowRequest('user1');
      
      for (let i = 0; i < 3; i++) {
        debouncer.shouldAllowRequest('user1');
      }
      
      const result = debouncer.shouldAllowRequest('user1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Too many rapid requests');
    });
  });

  describe('User isolation', () => {
    it('should track users independently', () => {
      debouncer.shouldAllowRequest('user1');
      debouncer.shouldAllowRequest('user1');
      
      const result1 = debouncer.shouldAllowRequest('user1');
      const result2 = debouncer.shouldAllowRequest('user2');
      
      expect(result1.allowed).toBe(false);
      expect(result2.allowed).toBe(true);
    });

    it('should reset specific user', () => {
      debouncer.shouldAllowRequest('user1');
      debouncer.shouldAllowRequest('user1');
      
      debouncer.resetUser('user1');
      
      const result = debouncer.shouldAllowRequest('user1');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track active users', () => {
      debouncer.shouldAllowRequest('user1');
      debouncer.shouldAllowRequest('user2');
      debouncer.shouldAllowRequest('user3');
      
      const stats = debouncer.getStats();
      expect(stats.activeUsers).toBe(3);
    });

    it('should track total violations', () => {
      debouncer.shouldAllowRequest('user1');
      debouncer.shouldAllowRequest('user1');
      debouncer.shouldAllowRequest('user1');
      
      debouncer.shouldAllowRequest('user2');
      debouncer.shouldAllowRequest('user2');
      
      const stats = debouncer.getStats();
      expect(stats.totalViolations).toBe(3);
    });

    it('should calculate average request count', () => {
      debouncer.shouldAllowRequest('user1');
      debouncer.shouldAllowRequest('user1');
      
      debouncer.shouldAllowRequest('user2');
      
      const stats = debouncer.getStats();
      expect(stats.averageRequestCount).toBe(1.5);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired entries', async () => {
      debouncer = new RequestDebouncer(100, 3, 100);
      
      debouncer.shouldAllowRequest('user1');
      debouncer.shouldAllowRequest('user2');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const cleaned = debouncer.cleanup();
      expect(cleaned).toBe(2);
    });
  });
});