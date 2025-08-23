import { vi } from 'vitest';

export interface MockSupabaseResponse<T = any> {
  data: T;
  error: any;
}

export interface MockSupabaseQueryBuilder {
  // Query builder methods
  select(query?: string): MockSupabaseQueryBuilder;
  insert(data: any): MockSupabaseQueryBuilder;
  update(data: any): MockSupabaseQueryBuilder;
  upsert(data: any): MockSupabaseQueryBuilder;
  delete(): MockSupabaseQueryBuilder;
  
  // Filter methods
  eq(column: string, value: any): MockSupabaseQueryBuilder;
  neq(column: string, value: any): MockSupabaseQueryBuilder;
  gt(column: string, value: any): MockSupabaseQueryBuilder;
  gte(column: string, value: any): MockSupabaseQueryBuilder;
  lt(column: string, value: any): MockSupabaseQueryBuilder;
  lte(column: string, value: any): MockSupabaseQueryBuilder;
  like(column: string, pattern: string): MockSupabaseQueryBuilder;
  ilike(column: string, pattern: string): MockSupabaseQueryBuilder;
  is(column: string, value: any): MockSupabaseQueryBuilder;
  in(column: string, values: any[]): MockSupabaseQueryBuilder;
  contains(column: string, value: any): MockSupabaseQueryBuilder;
  containedBy(column: string, value: any): MockSupabaseQueryBuilder;
  rangeGt(column: string, value: any): MockSupabaseQueryBuilder;
  rangeGte(column: string, value: any): MockSupabaseQueryBuilder;
  rangeLt(column: string, value: any): MockSupabaseQueryBuilder;
  rangeLte(column: string, value: any): MockSupabaseQueryBuilder;
  rangeAdjacent(column: string, value: any): MockSupabaseQueryBuilder;
  overlaps(column: string, value: any): MockSupabaseQueryBuilder;
  textSearch(column: string, query: string): MockSupabaseQueryBuilder;
  match(query: Record<string, any>): MockSupabaseQueryBuilder;
  not(column: string, operator: string, value: any): MockSupabaseQueryBuilder;
  or(filters: string): MockSupabaseQueryBuilder;
  filter(column: string, operator: string, value?: any): MockSupabaseQueryBuilder;
  
  // Ordering and limiting
  order(column: string, options?: { ascending?: boolean }): MockSupabaseQueryBuilder;
  limit(count: number): MockSupabaseQueryBuilder;
  range(from: number, to: number): MockSupabaseQueryBuilder;
  
  // Execution methods
  single(): Promise<MockSupabaseResponse>;
  maybeSingle(): Promise<MockSupabaseResponse>;
  then(resolve: (value: MockSupabaseResponse) => any): Promise<any>;
  catch(reject: (reason?: any) => any): Promise<any>;
  finally(callback: () => void): Promise<any>;
  
  // Properties for direct access (legacy compatibility)
  data: any;
  error: any;
}

export interface MockSupabaseClient {
  from(table: string): MockSupabaseQueryBuilder;
  rpc(fn: string, args?: any): Promise<MockSupabaseResponse>;
  auth: {
    getUser(): Promise<MockSupabaseResponse>;
    signInWithOAuth(credentials: any): Promise<MockSupabaseResponse>;
    signOut(): Promise<{ error: any }>;
  };
  storage: {
    from(bucket: string): {
      upload(path: string, file: any): Promise<MockSupabaseResponse>;
      download(path: string): Promise<MockSupabaseResponse>;
      remove(paths: string[]): Promise<MockSupabaseResponse>;
    };
  };
  channel(topic: string): {
    on(event: string, callback: Function): any;
    subscribe(): any;
  };
}

class MockSupabaseQueryBuilderImpl implements MockSupabaseQueryBuilder {
  private _data: any = [];
  private _error: any = null;
  private _mockConfig: {
    shouldResolve: boolean;
    resolveValue: any;
    rejectValue: any;
    delay?: number;
  };

  constructor(config?: Partial<MockSupabaseQueryBuilderImpl['_mockConfig']>) {
    this._mockConfig = {
      shouldResolve: true,
      resolveValue: { data: [], error: null },
      rejectValue: null,
      delay: 0,
      ...config
    };
  }

  // Configuration methods
  mockResolvedValue(value: any): this {
    this._mockConfig.shouldResolve = true;
    this._mockConfig.resolveValue = value;
    return this;
  }

  mockResolvedValueOnce(value: any): this {
    // For now, treat this the same as mockResolvedValue
    // In a more complex implementation, we could track call counts
    return this.mockResolvedValue(value);
  }

  mockRejectedValue(value: any): this {
    this._mockConfig.shouldResolve = false;
    this._mockConfig.rejectValue = value;
    return this;
  }

  mockRejectedValueOnce(value: any): this {
    // For now, treat this the same as mockRejectedValue
    return this.mockRejectedValue(value);
  }

  mockDelay(ms: number): this {
    this._mockConfig.delay = ms;
    return this;
  }

  // Query builder methods - all return this for chaining
  select(query?: string): this { return this; }
  insert(data: any): this { return this; }
  update(data: any): this { return this; }
  upsert(data: any): this { return this; }
  delete(): this { return this; }
  
  // Filter methods
  eq(column: string, value: any): this { return this; }
  neq(column: string, value: any): this { return this; }
  gt(column: string, value: any): this { return this; }
  gte(column: string, value: any): this { return this; }
  lt(column: string, value: any): this { return this; }
  lte(column: string, value: any): this { return this; }
  like(column: string, pattern: string): this { return this; }
  ilike(column: string, pattern: string): this { return this; }
  is(column: string, value: any): this { return this; }
  in(column: string, values: any[]): this { return this; }
  contains(column: string, value: any): this { return this; }
  containedBy(column: string, value: any): this { return this; }
  rangeGt(column: string, value: any): this { return this; }
  rangeGte(column: string, value: any): this { return this; }
  rangeLt(column: string, value: any): this { return this; }
  rangeLte(column: string, value: any): this { return this; }
  rangeAdjacent(column: string, value: any): this { return this; }
  overlaps(column: string, value: any): this { return this; }
  textSearch(column: string, query: string): this { return this; }
  match(query: Record<string, any>): this { return this; }
  not(column: string, operator: string, value: any): this { return this; }
  or(filters: string): this { return this; }
  filter(column: string, operator: string, value?: any): this { return this; }
  
  // Ordering and limiting
  order(column: string, options?: { ascending?: boolean }): this { return this; }
  limit(count: number): this { return this; }
  range(from: number, to: number): this { return this; }
  
  // Execution methods
  async single(): Promise<MockSupabaseResponse> {
    if (this._mockConfig.delay) {
      await new Promise(resolve => setTimeout(resolve, this._mockConfig.delay));
    }
    
    if (this._mockConfig.shouldResolve) {
      const result = this._mockConfig.resolveValue;
      // If data is an empty array and single() is called, return null instead
      if (Array.isArray(result.data) && result.data.length === 0) {
        return { data: null, error: null };
      }
      // If data is an array with items, return just the first item
      if (Array.isArray(result.data) && result.data.length > 0) {
        return { data: result.data[0], error: null };
      }
      return result;
    } else {
      throw this._mockConfig.rejectValue;
    }
  }

  async maybeSingle(): Promise<MockSupabaseResponse> {
    return this.single();
  }

  async then(resolve: (value: MockSupabaseResponse) => any): Promise<any> {
    const result = await this.single();
    return resolve(result);
  }

  async catch(reject: (reason?: any) => any): Promise<any> {
    try {
      return await this.single();
    } catch (error) {
      return reject(error);
    }
  }

  async finally(callback: () => void): Promise<any> {
    try {
      return await this.single();
    } finally {
      callback();
    }
  }

  // Legacy properties
  get data() { return this._data; }
  set data(value) { this._data = value; }
  
  get error() { return this._error; }
  set error(value) { this._error = value; }
}

export class MockSupabaseClientImpl implements MockSupabaseClient {
  private _defaultQueryConfig: any;

  constructor(config?: any) {
    this._defaultQueryConfig = config;
  }

  from(table: string): MockSupabaseQueryBuilder {
    return new MockSupabaseQueryBuilderImpl(this._defaultQueryConfig);
  }

  rpc = vi.fn().mockResolvedValue({ data: null, error: null });

  auth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: null, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null })
  };

  storage = {
    from: vi.fn((bucket: string) => ({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      download: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  };

  channel = vi.fn((topic: string) => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis()
  }));
}

// Factory functions for creating mocks
export const createMockSupabaseClient = (config?: any): MockSupabaseClient => {
  return new MockSupabaseClientImpl(config);
};

export const createMockQueryBuilder = (config?: any): MockSupabaseQueryBuilder => {
  return new MockSupabaseQueryBuilderImpl(config);
};

// Pre-configured clients for common use cases
export const mockSupabaseClient = createMockSupabaseClient();
export const mockServiceRoleClient = createMockSupabaseClient();

// Mock implementations for vi.mock()
export const supabaseMocks = {
  createClient: vi.fn(() => createMockSupabaseClient()),
  createBrowserClient: vi.fn(() => createMockSupabaseClient()),
  createServerClient: vi.fn(() => createMockSupabaseClient()),
};