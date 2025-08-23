import { vi } from 'vitest';
import type {
  MockUtilities,
  DeepPartial,
  MockConfig,
  MockState,
  MockLifecycleHooks,
  AdvancedMockConfig,
  CommonMockScenario
} from '../types';

/**
 * Utility functions for common mock patterns and operations
 */
export class MockUtils implements MockUtilities {
  /**
   * Creates a partial mock by merging overrides with a base object
   */
  createPartialMock<T>(base: T, overrides: Partial<T>): T {
    if (typeof base !== 'object' || base === null) {
      throw new Error('Base must be a non-null object');
    }
    return { ...base, ...overrides };
  }

  /**
   * Creates a mock that resolves with a value after a delay
   */
  async createMockWithDelay<T>(value: T, delay: number): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, delay));
    return value;
  }

  /**
   * Creates a standardized mock error
   */
  createMockError(message: string, code?: string | number): Error {
    const error = new Error(message);
    if (code) {
      (error as any).code = code;
    }
    return error;
  }

  /**
   * Generates a unique mock ID with optional prefix
   */
  generateMockId(prefix = 'mock'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generates a mock timestamp in ISO format
   */
  generateMockTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Generates a mock email address
   */
  generateMockEmail(domain = 'example.com'): string {
    const username = `user${Math.random().toString(36).substring(2, 8)}`;
    return `${username}@${domain}`;
  }

  /**
   * Generates a mock URL
   */
  generateMockUrl(domain = 'example.com'): string {
    const path = Math.random().toString(36).substring(2, 8);
    return `https://${domain}/${path}`;
  }

  /**
   * Creates a deep clone of an object
   */
  deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as T;
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as T;
    }
    
    if (typeof obj === 'object') {
      const cloned = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    
    return obj;
  }

  /**
   * Merges deep partial objects
   */
  deepMerge<T>(target: T, source: DeepPartial<T>): T {
    const result = this.deepClone(target);
    
    if (typeof source !== 'object' || source === null) {
      return result;
    }
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = (result as any)[key];
        
        if (typeof targetValue === 'object' && targetValue !== null && 
            typeof sourceValue === 'object' && sourceValue !== null &&
            !Array.isArray(targetValue) && !Array.isArray(sourceValue)) {
          (result as any)[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          (result as any)[key] = sourceValue;
        }
      }
    }
    
    return result;
  }
}

/**
 * Global instance of mock utilities
 */
export const mockUtils = new MockUtils();

/**
 * Spy utilities for enhanced mock testing
 */
export class SpyUtils {
  /**
   * Creates a spy with automatic cleanup
   */
  createAutoCleanupSpy<T extends (...args: any[]) => any>(
    object: any, 
    method: string,
    implementation?: T
  ) {
    const spy = vi.spyOn(object, method);
    if (implementation) {
      spy.mockImplementation(implementation);
    }
    
    // Add to cleanup registry
    this.addToCleanupRegistry(spy);
    return spy;
  }

  /**
   * Creates multiple spies with automatic cleanup
   */
  createMultipleSpies<T extends Record<string, any>>(
    object: T, 
    methods: (keyof T)[],
    implementations?: Partial<Record<keyof T, (...args: any[]) => any>>
  ) {
    const spies: Record<keyof T, any> = {} as any;
    
    methods.forEach(method => {
      const spy = vi.spyOn(object, method as string);
      if (implementations?.[method]) {
        spy.mockImplementation(implementations[method]);
      }
      spies[method] = spy;
      this.addToCleanupRegistry(spy);
    });
    
    return spies;
  }

  private cleanupRegistry: Set<any> = new Set();

  private addToCleanupRegistry(spy: any) {
    this.cleanupRegistry.add(spy);
  }

  /**
   * Cleans up all registered spies
   */
  cleanupAllSpies() {
    this.cleanupRegistry.forEach(spy => {
      if (spy && typeof spy.mockRestore === 'function') {
        spy.mockRestore();
      }
    });
    this.cleanupRegistry.clear();
  }

  /**
   * Creates a temporary spy that automatically restores after use
   */
  async withTemporarySpy<T extends (...args: any[]) => any, R>(
    object: any,
    method: string,
    implementation: T,
    callback: () => R | Promise<R>
  ): Promise<R> {
    const spy = vi.spyOn(object, method).mockImplementation(implementation);
    try {
      return await callback();
    } finally {
      spy.mockRestore();
    }
  }
}

/**
 * Global instance of spy utilities
 */
export const spyUtils = new SpyUtils();

/**
 * Mock state management utilities
 */
export class MockStateManager {
  private states: Map<string, MockState> = new Map();

  /**
   * Creates or updates a mock state
   */
  createState(mockName: string, initialState?: Partial<MockState>): MockState {
    const defaultState: MockState = {
      isConfigured: false,
      callCount: 0,
      allCalls: []
    };

    const state = { ...defaultState, ...initialState };
    this.states.set(mockName, state);
    return state;
  }

  /**
   * Gets a mock state
   */
  getState(mockName: string): MockState | undefined {
    return this.states.get(mockName);
  }

  /**
   * Updates a mock state
   */
  updateState(mockName: string, updates: Partial<MockState>): void {
    const currentState = this.states.get(mockName);
    if (currentState) {
      this.states.set(mockName, { ...currentState, ...updates });
    }
  }

  /**
   * Records a mock call
   */
  recordCall(mockName: string, args: any[], result?: any, error?: any): void {
    const state = this.states.get(mockName);
    if (state) {
      const callRecord = {
        args,
        timestamp: new Date().toISOString(),
        result,
        error
      };
      
      state.callCount++;
      state.lastCall = callRecord;
      state.allCalls.push(callRecord);
    }
  }

  /**
   * Clears all states
   */
  clearAllStates(): void {
    this.states.clear();
  }

  /**
   * Gets all states as an object
   */
  getAllStates(): Record<string, MockState> {
    const result: Record<string, MockState> = {};
    this.states.forEach((state, name) => {
      result[name] = state;
    });
    return result;
  }
}

/**
 * Global instance of mock state manager
 */
export const mockStateManager = new MockStateManager();

/**
 * Advanced mock factory with lifecycle hooks and validation
 */
export class AdvancedMockFactory<T = any> {
  private config: AdvancedMockConfig<T>;
  private mockFn: any;

  constructor(config: AdvancedMockConfig<T>) {
    this.config = config;
    this.mockFn = vi.fn(this.createMockImplementation.bind(this));
  }

  private async createMockImplementation(...args: any[]): Promise<T> {
    const mockName = this.config.hooks?.beforeCall ? 'advanced-mock' : 'mock';
    
    // Record call attempt
    mockStateManager.recordCall(mockName, args);

    try {
      // Run validation if provided
      if (this.config.validation && !this.config.validation(args)) {
        throw new Error('Mock validation failed');
      }

      // Run before hook
      await this.config.hooks?.beforeCall?.(args);

      // Transform args if transformer provided
      const finalArgs = this.config.transform ? this.config.transform(args) : args;

      // Check max calls limit
      const state = mockStateManager.getState(mockName);
      if (this.config.maxCalls && state && state.callCount > this.config.maxCalls) {
        throw new Error(`Mock exceeded maximum calls (${this.config.maxCalls})`);
      }

      // Apply delay if specified
      if (this.config.delay) {
        await new Promise(resolve => setTimeout(resolve, this.config.delay));
      }

      // Determine result
      let result: T;
      if (!this.config.shouldResolve) {
        throw this.config.rejectValue || new Error('Mock rejected');
      } else {
        result = this.config.resolveValue as T;
      }

      // Run after hook
      await this.config.hooks?.afterCall?.(finalArgs, result);

      // Record successful call
      mockStateManager.recordCall(mockName, finalArgs, result);

      return result;
    } catch (error) {
      // Run error hook
      await this.config.hooks?.onError?.(args, error);

      // Record failed call
      mockStateManager.recordCall(mockName, args, undefined, error);

      throw error;
    }
  }

  /**
   * Gets the mock function
   */
  getMock() {
    return this.mockFn;
  }

  /**
   * Updates the configuration
   */
  configure(newConfig: Partial<AdvancedMockConfig<T>>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Resets the mock
   */
  reset(): void {
    this.mockFn.mockReset();
    this.config.hooks?.onReset?.();
  }
}

/**
 * Scenario-based mock management
 */
export class MockScenarioManager {
  private scenarios: Map<string, () => void> = new Map();
  private currentScenario: string | null = null;

  /**
   * Registers a scenario
   */
  registerScenario(name: string, setup: () => void): void {
    this.scenarios.set(name, setup);
  }

  /**
   * Activates a scenario
   */
  activateScenario(name: string): void {
    const setup = this.scenarios.get(name);
    if (!setup) {
      throw new Error(`Scenario '${name}' not found`);
    }
    
    setup();
    this.currentScenario = name;
  }

  /**
   * Gets the current scenario
   */
  getCurrentScenario(): string | null {
    return this.currentScenario;
  }

  /**
   * Clears the current scenario
   */
  clearScenario(): void {
    this.currentScenario = null;
  }

  /**
   * Registers common scenarios
   */
  registerCommonScenarios(): void {
    this.registerScenario('success', () => {
      // Configure all mocks for success
      mockUtils.createPartialMock({}, {});
    });

    this.registerScenario('error', () => {
      // Configure all mocks to fail
      // Implementation would depend on specific mocks
    });

    this.registerScenario('empty', () => {
      // Configure all mocks to return empty results
      // Implementation would depend on specific mocks
    });
  }
}

/**
 * Global instance of scenario manager
 */
export const mockScenarioManager = new MockScenarioManager();

/**
 * Utility functions for common test patterns
 */
export const testPatterns = {
  /**
   * Waits for a condition to be true with timeout
   */
  async waitFor(
    condition: () => boolean | Promise<boolean>, 
    timeout = 5000,
    interval = 100
  ): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  /**
   * Retries a function until it succeeds or max retries reached
   */
  async retry<T>(
    fn: () => T | Promise<T>,
    maxRetries = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  },

  /**
   * Creates a timeout promise for racing with other promises
   */
  timeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  },

  /**
   * Flushes all pending promises
   */
  async flushPromises(): Promise<void> {
    await new Promise(resolve => setImmediate(resolve));
  }
};

/**
 * Mock assertion utilities
 */
export const mockAssertions = {
  /**
   * Asserts that a mock was called with specific arguments
   */
  assertCalledWith<T extends (...args: any[]) => any>(
    mockFn: T,
    ...expectedArgs: Parameters<T>
  ): void {
    expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
  },

  /**
   * Asserts that a mock was called a specific number of times
   */
  assertCallCount<T extends (...args: any[]) => any>(
    mockFn: T,
    expectedCount: number
  ): void {
    expect(mockFn).toHaveBeenCalledTimes(expectedCount);
  },

  /**
   * Asserts that a mock returned a specific value
   */
  assertReturnValue<T extends (...args: any[]) => any>(
    mockFn: T,
    expectedValue: ReturnType<T>
  ): void {
    expect(mockFn).toHaveReturnedWith(expectedValue);
  },

  /**
   * Asserts the order of mock calls
   */
  assertCallOrder(...mockFns: any[]): void {
    const callTimes = mockFns.map(mock => mock.mock.invocationCallOrder || []);
    const allCalls = callTimes.flat().sort((a, b) => a - b);
    
    let currentMockIndex = 0;
    for (const callTime of allCalls) {
      while (currentMockIndex < mockFns.length && 
             !callTimes[currentMockIndex].includes(callTime)) {
        currentMockIndex++;
      }
      if (currentMockIndex >= mockFns.length) {
        throw new Error('Mock call order assertion failed');
      }
    }
  }
};

/**
 * Performance testing utilities for mocks
 */
export const mockPerformanceUtils = {
  /**
   * Measures the execution time of a mock-based operation
   */
  async measureExecutionTime<T>(operation: () => T | Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    return { result, duration };
  },

  /**
   * Benchmarks multiple mock scenarios
   */
  async benchmark(
    scenarios: Record<string, () => Promise<any>>,
    iterations = 100
  ): Promise<Record<string, { average: number; min: number; max: number }>> {
    const results: Record<string, { average: number; min: number; max: number }> = {};
    
    for (const [name, scenario] of Object.entries(scenarios)) {
      const durations: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const { duration } = await this.measureExecutionTime(scenario);
        durations.push(duration);
      }
      
      results[name] = {
        average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations)
      };
    }
    
    return results;
  }
};

// Export all utilities as a single object
export const mockUtilities = {
  mockUtils,
  spyUtils,
  mockStateManager,
  mockScenarioManager,
  testPatterns,
  mockAssertions,
  mockPerformanceUtils
};

// Re-export individual utilities for convenience
export {
  MockUtils,
  SpyUtils,
  MockStateManager,
  AdvancedMockFactory,
  MockScenarioManager
};