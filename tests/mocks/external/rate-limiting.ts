import { vi } from 'vitest';

// Rate limiting mock configuration
interface RateLimitMockConfig {
  shouldAllow: boolean;
  delay?: number;
  error?: any;
}

class RateLimitingMocks {
  private _config: RateLimitMockConfig = {
    shouldAllow: true,
    delay: 0
  };

  // Configuration methods
  configure(config: Partial<RateLimitMockConfig>): void {
    this._config = { ...this._config, ...config };
  }

  reset(): void {
    this._config = {
      shouldAllow: true,
      delay: 0
    };
  }

  // Helper method to execute with config
  private async executeWithConfig(): Promise<boolean> {
    if (this._config.delay) {
      await new Promise(resolve => setTimeout(resolve, this._config.delay));
    }

    if (this._config.error) {
      throw this._config.error;
    }

    return this._config.shouldAllow;
  }

  // Mock burst protection
  checkBurstLimit = vi.fn(async (
    identifier: string,
    operation: string,
    limit: number = 3,
    window: string = '1m'
  ): Promise<boolean> => {
    return this.executeWithConfig();
  });

  // Convenience methods for test scenarios
  mockRateLimitPass(): void {
    this.configure({ shouldAllow: true });
  }

  mockRateLimitBlock(): void {
    this.configure({ shouldAllow: false });
  }

  mockRateLimitError(error?: any): void {
    this.configure({
      error: error || new Error('Rate limiting service unavailable')
    });
  }

  mockSlowRateLimit(delay: number = 1000): void {
    this.configure({ delay });
  }

  // Reset all mocks
  resetAllMocks(): void {
    this.checkBurstLimit.mockReset();
    this.reset();
  }
}

// Export singleton instance
export const rateLimitingMocks = new RateLimitingMocks();

// Mock implementation for vi.mock()
export const burstProtection = {
  checkBurstLimit: rateLimitingMocks.checkBurstLimit
};

// Pre-configured test scenarios
export const rateLimitTestScenarios = {
  normalOperation: () => {
    rateLimitingMocks.mockRateLimitPass();
  },

  rateLimitExceeded: () => {
    rateLimitingMocks.mockRateLimitBlock();
  },

  rateLimitServiceDown: () => {
    rateLimitingMocks.mockRateLimitError();
  },

  slowRateLimit: () => {
    rateLimitingMocks.mockRateLimitPass();
    rateLimitingMocks.mockSlowRateLimit(2000);
  }
};