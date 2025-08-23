// TypeScript type definitions for all mock factories

// Re-export types from individual mock files for centralized access
export type {
  MockSupabaseResponse,
  MockSupabaseQueryBuilder,
  MockSupabaseClient
} from './database/supabase';

export type {
  MockCompany,
  MockEmail,
  MockIntelligenceRecord,
  MockAnalytics
} from './database/queries';

export type {
  MockNextRequest,
  MockNextResponse,
  MockHeaders,
  MockCookies
} from './nextjs/server';

export type {
  MockUser,
  MockSession,
  MockOrganization,
  MockAuth
} from './auth/clerk';

export type {
  MockAnthropicMessage,
  MockAnthropicCreateParams,
  MockOpenAIEmbedding,
  MockOpenAIEmbeddingResponse,
  MockOpenAIChatCompletion,
  MockResendEmail,
  MockResendSendResponse
} from './external/services';

export type {
  MockGmailMessage,
  MockGmailMessageList,
  MockGmailProfile,
  MockOAuth2Credentials
} from './external/gmail';

export type {
  MockPuppeteerPage,
  MockPuppeteerBrowser,
  MockPuppeteerLaunchOptions
} from './external/puppeteer';

export type {
  MockAxiomLogEntry,
  MockAxiomEvent,
  MockAxiomMetric,
  MockAxiomError
} from './external/axiom';

export type {
  CompanyFixture,
  EmailFixture,
  IntelligenceFixture,
  UserFixture,
  NewsletterFixture
} from './fixtures/data';

// Common mock configuration interfaces
export interface MockConfig<T = any> {
  shouldResolve: boolean;
  resolveValue?: T;
  rejectValue?: any;
  delay?: number;
}

export interface MockResponse<T = any> {
  data: T | null;
  error: any;
}

// Generic mock factory interface
export interface MockFactory<TConfig = any> {
  configure(config: Partial<TConfig>): void;
  reset(): void;
  resetAllMocks(): void;
}

// Mock instance creation options
export interface MockCreationOptions<T = any> {
  initialConfig?: T;
  autoReset?: boolean;
  collectCalls?: boolean;
}

// Test scenario types
export type TestScenarioName = 
  | 'empty' 
  | 'small' 
  | 'medium' 
  | 'large'
  | 'signedOut'
  | 'signedIn' 
  | 'withOrganization'
  | 'apiSuccess'
  | 'apiError'
  | 'networkDelay';

export interface TestScenario {
  name: TestScenarioName;
  description: string;
  setup: () => void | Promise<void>;
  teardown?: () => void | Promise<void>;
}

// Common data types used across mocks
export type FundingStatus = 
  | 'Pre-seed'
  | 'Seed' 
  | 'Series A'
  | 'Series B' 
  | 'Series C'
  | 'Series D'
  | 'Series E'
  | 'Public'
  | 'Acquired'
  | 'Unknown';

export type Industry =
  | 'Technology'
  | 'Healthcare' 
  | 'Financial Services'
  | 'Retail'
  | 'Beauty & Personal Care'
  | 'Fashion'
  | 'Food & Beverage'
  | 'Travel & Leisure'
  | 'Home & Garden'
  | 'Footwear'
  | 'Sustainability'
  | 'Other';

export type Sentiment = 'positive' | 'neutral' | 'negative';

export type NewsletterFrequency = 'daily' | 'weekly' | 'monthly' | 'irregular';

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export type MockLogLevel = 'debug' | 'info' | 'warn' | 'error';

export type MockHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type MockStatus = 'active' | 'inactive' | 'pending' | 'error' | 'completed';

// Mock assertion helpers
export interface MockAssertions {
  toBeCalled(): void;
  toBeCalledTimes(times: number): void;
  toBeCalledWith(...args: any[]): void;
  toHaveReturnedWith(value: any): void;
  toHaveResolvedWith(value: any): void;
  toHaveRejectedWith(error: any): void;
}

// Common mock utilities interface
export interface MockUtilities {
  createPartialMock<T>(base: T, overrides: Partial<T>): T;
  createMockWithDelay<T>(value: T, delay: number): Promise<T>;
  createMockError(message: string, code?: string | number): Error;
  generateMockId(prefix?: string): string;
  generateMockTimestamp(): string;
  generateMockEmail(domain?: string): string;
  generateMockUrl(domain?: string): string;
}

// Mock state management
export interface MockState {
  isConfigured: boolean;
  callCount: number;
  lastCall?: {
    args: any[];
    timestamp: string;
    result?: any;
    error?: any;
  };
  allCalls: Array<{
    args: any[];
    timestamp: string;
    result?: any;
    error?: any;
  }>;
}

// Mock lifecycle hooks
export interface MockLifecycleHooks {
  beforeCall?: (args: any[]) => void | Promise<void>;
  afterCall?: (args: any[], result: any) => void | Promise<void>;
  onError?: (args: any[], error: any) => void | Promise<void>;
  onReset?: () => void | Promise<void>;
}

// Advanced mock configuration
export interface AdvancedMockConfig<T = any> extends MockConfig<T> {
  hooks?: MockLifecycleHooks;
  state?: Partial<MockState>;
  validation?: (args: any[]) => boolean;
  transform?: (args: any[]) => any[];
  cache?: boolean;
  maxCalls?: number;
}

// Mock collection interface for grouped operations
export interface MockCollection {
  name: string;
  mocks: Record<string, MockFactory>;
  configure(config: Record<string, any>): void;
  reset(): void;
  resetAll(): void;
  getState(): Record<string, MockState>;
}

// Database-specific types
export interface DatabaseMockConfig {
  supabase: {
    defaultResponse: MockResponse;
    queryDelay: number;
    errorRate: number;
  };
  queries: {
    [queryName: string]: MockConfig;
  };
}

// Authentication-specific types
export interface AuthMockConfig {
  defaultUser: MockUser | null;
  sessionDuration: number;
  autoSignOut: boolean;
  organizationEnabled: boolean;
}

// External services-specific types
export interface ExternalServicesMockConfig {
  anthropic: MockConfig<MockAnthropicMessage>;
  openai: {
    embeddings: MockConfig<MockOpenAIEmbeddingResponse>;
    chat: MockConfig<MockOpenAIChatCompletion>;
  };
  resend: MockConfig<MockResendSendResponse>;
  gmail: {
    auth: MockConfig<MockOAuth2Credentials>;
    messages: MockConfig<MockGmailMessageList>;
  };
  puppeteer: {
    launch: MockConfig<boolean>;
    pdf: MockConfig<Buffer>;
  };
  axiom: {
    collectLogs: boolean;
    collectEvents: boolean;
    collectMetrics: boolean;
  };
}

// Global test utilities type
export interface GlobalTestUtils {
  mockSuccessfulAuth(): void;
  mockSignedInUser(overrides?: Partial<MockUser>): MockUser;
  mockSignedOutUser(): void;
  mockAnthropicSuccess(response?: string): void;
  mockAnthropicError(error?: any): void;
  mockOpenAIEmbeddingsSuccess(embeddings?: number[][]): void;
  mockResendSuccess(emailId?: string): void;
  mockPuppeteerPDFSuccess(): void;
  mockAxiomLogging(): void;
  mockGmailSuccess(): void;
  resetAllTestMocks(): void;
}

// Declare global augmentation for test utilities
declare global {
  namespace globalThis {
    var testUtils: GlobalTestUtils;
  }
}

// Export utility types for common patterns
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type MockFunction<T extends (...args: any[]) => any> = T & {
  mockReturnValue(value: ReturnType<T>): void;
  mockResolvedValue(value: Awaited<ReturnType<T>>): void;
  mockRejectedValue(error: any): void;
  mockImplementation(impl: T): void;
  mockReset(): void;
  mockClear(): void;
};

// Factory function types
export type MockFactoryFunction<T, TOptions = any> = (options?: TOptions) => T;

// Common error types for mocks
export class MockConfigurationError extends Error {
  constructor(message: string, public readonly mockName: string) {
    super(`Mock Configuration Error in ${mockName}: ${message}`);
    this.name = 'MockConfigurationError';
  }
}

export class MockValidationError extends Error {
  constructor(message: string, public readonly mockName: string, public readonly args: any[]) {
    super(`Mock Validation Error in ${mockName}: ${message}`);
    this.name = 'MockValidationError';
  }
}

export class MockTimeoutError extends Error {
  constructor(message: string, public readonly mockName: string, public readonly timeout: number) {
    super(`Mock Timeout Error in ${mockName}: ${message} (timeout: ${timeout}ms)`);
    this.name = 'MockTimeoutError';
  }
}

// Type guards for runtime type checking
export function isMockResponse<T>(obj: any): obj is MockResponse<T> {
  return obj && typeof obj === 'object' && 'data' in obj && 'error' in obj;
}

export function isMockConfig<T>(obj: any): obj is MockConfig<T> {
  return obj && typeof obj === 'object' && 'shouldResolve' in obj;
}

export function isMockFactory(obj: any): obj is MockFactory {
  return obj && 
    typeof obj === 'object' && 
    'configure' in obj && 
    'reset' in obj && 
    'resetAllMocks' in obj &&
    typeof obj.configure === 'function' &&
    typeof obj.reset === 'function' &&
    typeof obj.resetAllMocks === 'function';
}

// Helper types for extracting mock types from complex structures
export type ExtractMockType<T> = T extends MockFunction<infer U> ? U : never;

export type MockReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

export type MockParameters<T> = T extends (...args: infer P) => any ? P : never;

// Conditional types for optional mock configuration
export type RequiredMockConfig<T> = Required<MockConfig<T>>;

export type OptionalMockConfig<T> = Partial<MockConfig<T>>;

// Union types for common mock scenarios
export type CommonMockScenario = 
  | 'success' 
  | 'error' 
  | 'timeout' 
  | 'empty' 
  | 'loading'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'serverError';

// Mapped types for batch operations
export type MockConfigMap<T extends Record<string, any>> = {
  [K in keyof T]: MockConfig<T[K]>;
};

export type MockStateMap<T extends Record<string, any>> = {
  [K in keyof T]: MockState;
};

// Template literal types for dynamic mock names
export type MockMethodName<T extends string> = `mock${Capitalize<T>}`;

export type MockEventName<T extends string> = `${T}Event`;

export type MockErrorName<T extends string> = `${T}Error`;

// Advanced utility types
export type NonNullable<T> = T extends null | undefined ? never : T;

export type Awaitable<T> = T | Promise<T>;

export type MaybeArray<T> = T | T[];

export type StringOrNumber = string | number;

export type AnyFunction = (...args: any[]) => any;

export type AnyAsyncFunction = (...args: any[]) => Promise<any>;

// Type-safe mock creation
export interface TypeSafeMockFactory<T> {
  create(data?: DeepPartial<T>): T;
  createMany(count: number, data?: DeepPartial<T>): T[];
  createPartial(data: DeepPartial<T>): Partial<T>;
  extend<U>(base: T, extension: U): T & U;
}

// Mock preset types
export interface MockPreset<T = any> {
  name: string;
  description: string;
  config: T;
  apply(): void;
  revert?(): void;
}

export type MockPresetCollection<T extends Record<string, any>> = {
  [K in keyof T]: MockPreset<T[K]>;
};