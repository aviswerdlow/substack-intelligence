import { LRUCache } from 'lru-cache';

interface DebounceEntry {
  lastRequestTime: number;
  requestCount: number;
  violations: number;
}

export class RequestDebouncer {
  private userRequests: LRUCache<string, DebounceEntry>;
  private readonly minIntervalMs: number;
  private readonly maxViolations: number;
  private readonly windowMs: number;

  constructor(
    minIntervalMs: number = 1000,
    maxViolations: number = 10,
    windowMs: number = 60000
  ) {
    this.minIntervalMs = minIntervalMs;
    this.maxViolations = maxViolations;
    this.windowMs = windowMs;
    
    this.userRequests = new LRUCache<string, DebounceEntry>({
      max: 1000,
      ttl: windowMs
    });
  }

  shouldAllowRequest(userId: string): {
    allowed: boolean;
    reason?: string;
    waitMs?: number;
    violations?: number;
  } {
    const now = Date.now();
    const entry = this.userRequests.get(userId);

    if (!entry) {
      this.userRequests.set(userId, {
        lastRequestTime: now,
        requestCount: 1,
        violations: 0
      });
      return { allowed: true };
    }

    const timeSinceLastRequest = now - entry.lastRequestTime;

    if (entry.violations >= this.maxViolations) {
      return {
        allowed: false,
        reason: 'Too many rapid requests. Please wait before trying again.',
        violations: entry.violations
      };
    }

    if (timeSinceLastRequest < this.minIntervalMs) {
      entry.violations++;
      entry.lastRequestTime = now;
      this.userRequests.set(userId, entry);
      
      return {
        allowed: false,
        reason: 'Request too soon after previous request',
        waitMs: this.minIntervalMs - timeSinceLastRequest,
        violations: entry.violations
      };
    }

    entry.lastRequestTime = now;
    entry.requestCount++;
    if (entry.violations > 0) {
      entry.violations = Math.max(0, entry.violations - 1);
    }
    this.userRequests.set(userId, entry);

    return { allowed: true };
  }

  resetUser(userId: string): void {
    this.userRequests.delete(userId);
  }

  getStats(): {
    activeUsers: number;
    totalViolations: number;
    averageRequestCount: number;
  } {
    const entries = Array.from(this.userRequests.values());
    const totalViolations = entries.reduce((sum, e) => sum + e.violations, 0);
    const averageRequestCount = entries.length > 0
      ? entries.reduce((sum, e) => sum + e.requestCount, 0) / entries.length
      : 0;

    return {
      activeUsers: this.userRequests.size,
      totalViolations,
      averageRequestCount: Math.round(averageRequestCount * 100) / 100
    };
  }

  cleanup(): number {
    const initialSize = this.userRequests.size;
    this.userRequests.purgeStale();
    return initialSize - this.userRequests.size;
  }
}

const globalDebouncer = new RequestDebouncer(1000, 10, 60000);

export default globalDebouncer;