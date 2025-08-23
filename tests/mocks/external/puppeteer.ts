import { vi } from 'vitest';

// Puppeteer Types
export interface MockPuppeteerPage {
  setContent(html: string): Promise<void>;
  goto(url: string, options?: any): Promise<any>;
  setViewport(viewport: { width: number; height: number }): Promise<void>;
  waitForSelector(selector: string, options?: any): Promise<any>;
  waitForTimeout(timeout: number): Promise<void>;
  pdf(options?: any): Promise<Buffer>;
  screenshot(options?: any): Promise<Buffer>;
  evaluate<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T>;
  $eval<T>(selector: string, fn: (element: Element, ...args: any[]) => T, ...args: any[]): Promise<T>;
  $$eval<T>(selector: string, fn: (elements: Element[], ...args: any[]) => T, ...args: any[]): Promise<T>;
  type(selector: string, text: string, options?: any): Promise<void>;
  click(selector: string, options?: any): Promise<void>;
  select(selector: string, ...values: string[]): Promise<string[]>;
  focus(selector: string): Promise<void>;
  hover(selector: string): Promise<void>;
  close(): Promise<void>;
  isClosed(): boolean;
  content(): Promise<string>;
  title(): Promise<string>;
  url(): string;
}

export interface MockPuppeteerBrowser {
  newPage(): Promise<MockPuppeteerPage>;
  pages(): Promise<MockPuppeteerPage[]>;
  close(): Promise<void>;
  isConnected(): boolean;
  version(): Promise<string>;
  wsEndpoint(): string;
}

export interface MockPuppeteerLaunchOptions {
  headless?: boolean | 'new' | 'shell';
  devtools?: boolean;
  executablePath?: string;
  args?: string[];
  ignoreDefaultArgs?: boolean | string[];
  timeout?: number;
  dumpio?: boolean;
  env?: Record<string, string>;
  pipe?: boolean;
}

// Puppeteer mock configuration
interface PuppeteerMockConfig {
  browser: {
    shouldLaunch: boolean;
    launchError?: any;
    isConnected: boolean;
    version: string;
    wsEndpoint: string;
  };
  page: {
    shouldCreate: boolean;
    createError?: any;
    content: string;
    title: string;
    url: string;
    isClosed: boolean;
    pdfBuffer?: Buffer;
    screenshotBuffer?: Buffer;
    evaluationResults: Map<string, any>;
  };
  delays: {
    launch?: number;
    newPage?: number;
    navigation?: number;
    pdf?: number;
    screenshot?: number;
  };
}

class PuppeteerMocks {
  private _config: PuppeteerMockConfig = {
    browser: {
      shouldLaunch: true,
      isConnected: true,
      version: '21.5.2',
      wsEndpoint: 'ws://127.0.0.1:9222'
    },
    page: {
      shouldCreate: true,
      content: '<html><body><h1>Mock Page</h1></body></html>',
      title: 'Mock Page Title',
      url: 'about:blank',
      isClosed: false,
      pdfBuffer: Buffer.from('mock-pdf-content'),
      screenshotBuffer: Buffer.from('mock-screenshot-content'),
      evaluationResults: new Map()
    },
    delays: {
      launch: 0,
      newPage: 0,
      navigation: 0,
      pdf: 0,
      screenshot: 0
    }
  };

  // Configuration methods
  configureBrowser(config: Partial<PuppeteerMockConfig['browser']>): void {
    this._config.browser = { ...this._config.browser, ...config };
  }

  configurePage(config: Partial<PuppeteerMockConfig['page']>): void {
    this._config.page = { ...this._config.page, ...config };
  }

  configureDelays(delays: Partial<PuppeteerMockConfig['delays']>): void {
    this._config.delays = { ...this._config.delays, ...delays };
  }

  reset(): void {
    this._config = {
      browser: {
        shouldLaunch: true,
        isConnected: true,
        version: '21.5.2',
        wsEndpoint: 'ws://127.0.0.1:9222'
      },
      page: {
        shouldCreate: true,
        content: '<html><body><h1>Mock Page</h1></body></html>',
        title: 'Mock Page Title',
        url: 'about:blank',
        isClosed: false,
        pdfBuffer: Buffer.from('mock-pdf-content'),
        screenshotBuffer: Buffer.from('mock-screenshot-content'),
        evaluationResults: new Map()
      },
      delays: {}
    };
  }

  // Page mock implementation
  createMockPage(): MockPuppeteerPage {
    const pageConfig = this._config.page;
    const delays = this._config.delays;

    return {
      setContent: vi.fn(async (html: string) => {
        if (delays.navigation) {
          await new Promise(resolve => setTimeout(resolve, delays.navigation));
        }
        pageConfig.content = html;
      }),

      goto: vi.fn(async (url: string, options?: any) => {
        if (delays.navigation) {
          await new Promise(resolve => setTimeout(resolve, delays.navigation));
        }
        pageConfig.url = url;
        return { status: () => 200, ok: () => true };
      }),

      setViewport: vi.fn(async (viewport: { width: number; height: number }) => {
        // Mock viewport setting
      }),

      waitForSelector: vi.fn(async (selector: string, options?: any) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {}; // Mock element
      }),

      waitForTimeout: vi.fn(async (timeout: number) => {
        await new Promise(resolve => setTimeout(resolve, Math.min(timeout, 100)));
      }),

      pdf: vi.fn(async (options?: any) => {
        if (delays.pdf) {
          await new Promise(resolve => setTimeout(resolve, delays.pdf));
        }
        return pageConfig.pdfBuffer || Buffer.from('mock-pdf-content');
      }),

      screenshot: vi.fn(async (options?: any) => {
        if (delays.screenshot) {
          await new Promise(resolve => setTimeout(resolve, delays.screenshot));
        }
        return pageConfig.screenshotBuffer || Buffer.from('mock-screenshot-content');
      }),

      evaluate: vi.fn(async <T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T> => {
        // Try to execute the function for simple cases, or return mock result
        try {
          return fn(...args);
        } catch {
          return pageConfig.evaluationResults.get('default') as T;
        }
      }),

      $eval: vi.fn(async <T>(selector: string, fn: (element: Element, ...args: any[]) => T, ...args: any[]): Promise<T> => {
        return pageConfig.evaluationResults.get(selector) as T || 'mock-result' as T;
      }),

      $$eval: vi.fn(async <T>(selector: string, fn: (elements: Element[], ...args: any[]) => T, ...args: any[]): Promise<T> => {
        return pageConfig.evaluationResults.get(`${selector}[]`) as T || [] as T;
      }),

      type: vi.fn(async (selector: string, text: string, options?: any) => {
        await new Promise(resolve => setTimeout(resolve, 50));
      }),

      click: vi.fn(async (selector: string, options?: any) => {
        await new Promise(resolve => setTimeout(resolve, 50));
      }),

      select: vi.fn(async (selector: string, ...values: string[]) => {
        return values;
      }),

      focus: vi.fn(async (selector: string) => {
        // Mock focus
      }),

      hover: vi.fn(async (selector: string) => {
        // Mock hover
      }),

      close: vi.fn(async () => {
        pageConfig.isClosed = true;
      }),

      isClosed: vi.fn(() => pageConfig.isClosed),

      content: vi.fn(async () => pageConfig.content),

      title: vi.fn(async () => pageConfig.title),

      url: vi.fn(() => pageConfig.url)
    };
  }

  // Browser mock implementation
  createMockBrowser(): MockPuppeteerBrowser {
    const browserConfig = this._config.browser;
    const pages: MockPuppeteerPage[] = [];

    return {
      newPage: vi.fn(async () => {
        if (!browserConfig.shouldLaunch) {
          throw browserConfig.launchError || new Error('Browser not launched');
        }
        
        if (!this._config.page.shouldCreate) {
          throw this._config.page.createError || new Error('Failed to create page');
        }

        if (this._config.delays.newPage) {
          await new Promise(resolve => setTimeout(resolve, this._config.delays.newPage));
        }

        const page = this.createMockPage();
        pages.push(page);
        return page;
      }),

      pages: vi.fn(async () => pages),

      close: vi.fn(async () => {
        browserConfig.isConnected = false;
        // Close all pages
        await Promise.all(pages.map(page => page.close()));
        pages.length = 0;
      }),

      isConnected: vi.fn(() => browserConfig.isConnected),

      version: vi.fn(async () => browserConfig.version),

      wsEndpoint: vi.fn(() => browserConfig.wsEndpoint)
    };
  }

  // Puppeteer main functions
  launch = vi.fn(async (options?: MockPuppeteerLaunchOptions): Promise<MockPuppeteerBrowser> => {
    if (!this._config.browser.shouldLaunch) {
      throw this._config.browser.launchError || new Error('Failed to launch browser');
    }

    if (this._config.delays.launch) {
      await new Promise(resolve => setTimeout(resolve, this._config.delays.launch));
    }

    return this.createMockBrowser();
  });

  connect = vi.fn(async (options?: { browserWSEndpoint?: string; browserURL?: string }): Promise<MockPuppeteerBrowser> => {
    if (!this._config.browser.shouldLaunch) {
      throw this._config.browser.launchError || new Error('Failed to connect to browser');
    }

    return this.createMockBrowser();
  });

  executablePath = vi.fn(() => '/usr/bin/chromium');

  // Utility methods for test scenarios
  mockSuccessfulLaunch(customPage?: Partial<PuppeteerMockConfig['page']>): void {
    this.configureBrowser({ shouldLaunch: true });
    if (customPage) {
      this.configurePage(customPage);
    }
  }

  mockLaunchError(error?: any): void {
    this.configureBrowser({
      shouldLaunch: false,
      launchError: error || new Error('Failed to launch Puppeteer browser')
    });
  }

  mockPDFGeneration(pdfContent?: Buffer): void {
    this.configurePage({
      pdfBuffer: pdfContent || Buffer.from('mock-pdf-content')
    });
  }

  mockPDFError(): void {
    this.configurePage({
      pdfBuffer: undefined
    });
    
    // Override the pdf method to throw an error
    const originalCreateMockPage = this.createMockPage;
    this.createMockPage = () => {
      const page = originalCreateMockPage.call(this);
      page.pdf = vi.fn(async () => {
        throw new Error('PDF generation failed');
      });
      return page;
    };
  }

  mockPageContent(content: string, title?: string): void {
    this.configurePage({
      content,
      title: title || 'Mock Page'
    });
  }

  mockEvaluationResult(selector: string, result: any): void {
    this._config.page.evaluationResults.set(selector, result);
  }

  mockNetworkDelay(delays: Partial<PuppeteerMockConfig['delays']>): void {
    this.configureDelays(delays);
  }

  // Reset all mocks
  resetAllMocks(): void {
    Object.getOwnPropertyNames(this)
      .filter(name => typeof (this as any)[name]?.mockReset === 'function')
      .forEach(name => (this as any)[name].mockReset());
    
    this.reset();
  }
}

// Export singleton instance
export const puppeteerMocks = new PuppeteerMocks();

// Export individual mocks for direct use
export const {
  launch,
  connect,
  executablePath
} = puppeteerMocks;

// Mock implementations for vi.mock('puppeteer')
export const puppeteerModuleMocks = {
  default: {
    launch,
    executablePath,
    connect
  },
  launch,
  executablePath,
  connect
};

// Pre-configured test scenarios
export const puppeteerTestScenarios = {
  successfulPDFGeneration: () => {
    puppeteerMocks.mockSuccessfulLaunch();
    puppeteerMocks.mockPDFGeneration(Buffer.from('successful-pdf-content'));
  },

  pdfGenerationFailure: () => {
    puppeteerMocks.mockSuccessfulLaunch();
    puppeteerMocks.mockPDFError();
  },

  browserLaunchFailure: () => {
    puppeteerMocks.mockLaunchError();
  },

  slowNetwork: () => {
    puppeteerMocks.mockSuccessfulLaunch();
    puppeteerMocks.mockNetworkDelay({
      launch: 2000,
      newPage: 1000,
      navigation: 1500,
      pdf: 3000
    });
  },

  reportGeneration: () => {
    puppeteerMocks.mockSuccessfulLaunch();
    puppeteerMocks.mockPageContent(`
      <html>
        <body>
          <h1>Daily Intelligence Report</h1>
          <div class="company">Glossier</div>
          <div class="company">Warby Parker</div>
        </body>
      </html>
    `, 'Daily Intelligence Report');
    puppeteerMocks.mockPDFGeneration(Buffer.from('report-pdf-content'));
  }
};