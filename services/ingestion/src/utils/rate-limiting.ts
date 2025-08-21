// Stub rate limiting utilities for ingestion service

class BurstProtection {
  private static instance: BurstProtection;
  private limits = new Map<string, { count: number; resetTime: number }>();

  static getInstance(): BurstProtection {
    if (!BurstProtection.instance) {
      BurstProtection.instance = new BurstProtection();
    }
    return BurstProtection.instance;
  }

  async checkBurstLimit(
    identifier: string,
    operation: string,
    limit: number = 3,
    window: string = '1m'
  ): Promise<boolean> {
    const key = `${operation}:${identifier}`;
    const now = Date.now();
    
    // Parse window (simplified - only handles minutes and hours)
    let windowMs = 60000; // default 1 minute
    if (window.endsWith('h')) {
      windowMs = parseInt(window) * 3600000;
    } else if (window.endsWith('m')) {
      windowMs = parseInt(window) * 60000;
    }
    
    const entry = this.limits.get(key);
    
    if (!entry || entry.resetTime < now) {
      // Reset or new entry
      this.limits.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (entry.count >= limit) {
      // Rate limit exceeded
      console.warn(`Burst limit exceeded for ${key}`);
      return false;
    }
    
    // Increment count
    entry.count++;
    return true;
  }
}

export const burstProtection = BurstProtection.getInstance();