import { vi } from 'vitest';

// Mock NextRequest
export interface MockNextRequest {
  url: string;
  nextUrl: URL;
  method: string;
  headers: MockHeaders;
  cookies: MockCookies;
  json(): Promise<any>;
  text(): Promise<string>;
  formData(): Promise<FormData>;
  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
  clone(): MockNextRequest;
}

export interface MockNextResponse {
  json(data: any, options?: { status?: number; headers?: Record<string, string> }): MockNextResponse;
  text(text: string, options?: { status?: number; headers?: Record<string, string> }): MockNextResponse;
  redirect(url: string, status?: number): MockNextResponse;
  rewrite(destination: string): MockNextResponse;
  next(options?: { headers?: Record<string, string> }): MockNextResponse;
  status: number;
  ok: boolean;
  headers: MockHeaders;
  cookies: MockCookies;
}

export interface MockHeaders {
  get(name: string): string | null;
  set(name: string, value: string): void;
  append(name: string, value: string): void;
  delete(name: string): void;
  has(name: string): boolean;
  entries(): IterableIterator<[string, string]>;
  forEach(callback: (value: string, key: string) => void): void;
  keys(): IterableIterator<string>;
  values(): IterableIterator<string>;
}

export interface MockCookies {
  get(name: string): { name: string; value: string } | undefined;
  getAll(): Array<{ name: string; value: string }>;
  set(name: string, value: string, options?: any): void;
  delete(name: string): void;
  has(name: string): boolean;
  clear(): void;
}

class MockHeadersImpl implements MockHeaders {
  private _headers: Map<string, string> = new Map();

  get(name: string): string | null {
    return this._headers.get(name.toLowerCase()) || null;
  }

  set(name: string, value: string): void {
    this._headers.set(name.toLowerCase(), value);
  }

  append(name: string, value: string): void {
    const existing = this._headers.get(name.toLowerCase());
    this._headers.set(name.toLowerCase(), existing ? `${existing}, ${value}` : value);
  }

  delete(name: string): void {
    this._headers.delete(name.toLowerCase());
  }

  has(name: string): boolean {
    return this._headers.has(name.toLowerCase());
  }

  entries(): IterableIterator<[string, string]> {
    return this._headers.entries();
  }

  forEach(callback: (value: string, key: string) => void): void {
    this._headers.forEach(callback);
  }

  keys(): IterableIterator<string> {
    return this._headers.keys();
  }

  values(): IterableIterator<string> {
    return this._headers.values();
  }
}

class MockCookiesImpl implements MockCookies {
  private _cookies: Map<string, string> = new Map();

  get(name: string): { name: string; value: string } | undefined {
    const value = this._cookies.get(name);
    return value ? { name, value } : undefined;
  }

  getAll(): Array<{ name: string; value: string }> {
    return Array.from(this._cookies.entries()).map(([name, value]) => ({ name, value }));
  }

  set(name: string, value: string, options?: any): void {
    this._cookies.set(name, value);
  }

  delete(name: string): void {
    this._cookies.delete(name);
  }

  has(name: string): boolean {
    return this._cookies.has(name);
  }

  clear(): void {
    this._cookies.clear();
  }
}

class MockNextRequestImpl implements MockNextRequest {
  url: string;
  nextUrl: URL;
  method: string;
  headers: MockHeaders;
  cookies: MockCookies;
  private _body: any;

  constructor(url: string, options?: {
    method?: string;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    body?: any;
  }) {
    this.url = url;
    this.nextUrl = new URL(url);
    this.method = options?.method || 'GET';
    this.headers = new MockHeadersImpl();
    this.cookies = new MockCookiesImpl();
    this._body = options?.body;

    // Set headers
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        this.headers.set(key, value);
      });
    }

    // Set cookies
    if (options?.cookies) {
      Object.entries(options.cookies).forEach(([key, value]) => {
        this.cookies.set(key, value);
      });
    }
  }

  async json(): Promise<any> {
    return typeof this._body === 'string' ? JSON.parse(this._body) : this._body;
  }

  async text(): Promise<string> {
    return typeof this._body === 'string' ? this._body : JSON.stringify(this._body);
  }

  async formData(): Promise<FormData> {
    const formData = new FormData();
    if (this._body && typeof this._body === 'object') {
      Object.entries(this._body).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
    }
    return formData;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const text = await this.text();
    return new TextEncoder().encode(text).buffer;
  }

  async blob(): Promise<Blob> {
    const text = await this.text();
    return new Blob([text]);
  }

  clone(): MockNextRequest {
    return new MockNextRequestImpl(this.url, {
      method: this.method,
      body: this._body
    });
  }
}

class MockNextResponseImpl implements MockNextResponse {
  status: number = 200;
  ok: boolean = true;
  headers: MockHeaders = new MockHeadersImpl();
  cookies: MockCookies = new MockCookiesImpl();
  private _body: any;

  json(data: any, options?: { status?: number; headers?: Record<string, string> }): MockNextResponse {
    this._body = data;
    if (options?.status) {
      this.status = options.status;
      this.ok = options.status >= 200 && options.status < 300;
    }
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        this.headers.set(key, value);
      });
    }
    this.headers.set('content-type', 'application/json');
    return this;
  }

  text(text: string, options?: { status?: number; headers?: Record<string, string> }): MockNextResponse {
    this._body = text;
    if (options?.status) {
      this.status = options.status;
      this.ok = options.status >= 200 && options.status < 300;
    }
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        this.headers.set(key, value);
      });
    }
    this.headers.set('content-type', 'text/plain');
    return this;
  }

  redirect(url: string, status: number = 302): MockNextResponse {
    this.status = status;
    this.ok = false;
    this.headers.set('location', url);
    return this;
  }

  rewrite(destination: string): MockNextResponse {
    this.headers.set('x-middleware-rewrite', destination);
    return this;
  }

  next(options?: { headers?: Record<string, string> }): MockNextResponse {
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        this.headers.set(key, value);
      });
    }
    return this;
  }

  // Mock methods for accessing the response body in tests
  async getBody(): Promise<any> {
    return this._body;
  }
  
  // Add json() method to match Response API for tests
  async json(): Promise<any> {
    return this._body;
  }
  
  // Add text() method to match Response API for tests
  async text(): Promise<string> {
    return typeof this._body === 'string' ? this._body : JSON.stringify(this._body);
  }
}

// Factory functions
export const createMockNextRequest = (url: string, options?: {
  method?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  body?: any;
}): MockNextRequest => {
  return new MockNextRequestImpl(url, options);
};

export const createMockNextResponse = (): MockNextResponse => {
  return new MockNextResponseImpl();
};

export const createMockHeaders = (headers?: Record<string, string>): MockHeaders => {
  const mockHeaders = new MockHeadersImpl();
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      mockHeaders.set(key, value);
    });
  }
  return mockHeaders;
};

export const createMockCookies = (cookies?: Record<string, string>): MockCookies => {
  const mockCookies = new MockCookiesImpl();
  if (cookies) {
    Object.entries(cookies).forEach(([key, value]) => {
      mockCookies.set(key, value);
    });
  }
  return mockCookies;
};

// Mock implementations for vi.mock()
export const nextjsMocks = {
  NextRequest: vi.fn().mockImplementation((url: string, options?: any) => 
    createMockNextRequest(url, options)
  ),
  NextResponse: {
    json: vi.fn((data: any, options?: any) => 
      createMockNextResponse().json(data, options)
    ),
    text: vi.fn((text: string, options?: any) => 
      createMockNextResponse().text(text, options)
    ),
    redirect: vi.fn((url: string, status?: number) => 
      createMockNextResponse().redirect(url, status)
    ),
    rewrite: vi.fn((destination: string) => 
      createMockNextResponse().rewrite(destination)
    ),
    next: vi.fn((options?: any) => 
      createMockNextResponse().next(options)
    )
  }
};

// Mock for next/headers
export const headersMocks = {
  cookies: vi.fn(() => createMockCookies()),
  headers: vi.fn(() => createMockHeaders())
};

// Pre-configured instances for common use
export const mockNextRequest = createMockNextRequest('http://localhost:3000');
export const mockNextResponse = createMockNextResponse();
export const mockHeaders = createMockHeaders();
export const mockCookies = createMockCookies();