import { Page, BrowserContext } from '@playwright/test';

/**
 * Apply stealth techniques to make the browser appear more human-like
 * and bypass bot detection systems like Cloudflare
 */
export async function applyStealthMode(page: Page) {
  // Override navigator.webdriver flag
  await page.addInitScript(() => {
    // Remove webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });

    // Override plugins to look more realistic
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });

    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    });

    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission } as PermissionStatus) :
        originalQuery(parameters)
    );

    // Override chrome runtime
    (window as any).chrome = {
      runtime: {},
      // Add other chrome properties as needed
    };

    // Override console.debug to prevent detection
    const originalConsoleDebug = console.debug;
    console.debug = (...args) => {
      if (args[0]?.includes?.('devtools')) return;
      return originalConsoleDebug.apply(console, args);
    };
  });

  // Set realistic viewport
  await page.setViewportSize({ 
    width: 1920, 
    height: 1080 
  });

  // Add random mouse movements
  await addHumanLikeBehavior(page);
}

/**
 * Add human-like behavior to page interactions
 */
export async function addHumanLikeBehavior(page: Page) {
  // Random mouse movement
  await page.mouse.move(
    Math.random() * 100, 
    Math.random() * 100
  );

  // Random delay between actions
  await page.waitForTimeout(Math.random() * 1000 + 500);
}

/**
 * Create a stealth browser context with anti-detection measures
 */
export async function createStealthContext(browser: any): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: ['geolocation'],
    geolocation: { longitude: -73.935242, latitude: 40.730610 }, // New York
    colorScheme: 'light',
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    }
  });

  return context;
}

/**
 * Slow down typing to appear more human-like
 */
export async function humanType(page: Page, selector: string, text: string) {
  await page.click(selector);
  for (const char of text) {
    await page.keyboard.type(char);
    await page.waitForTimeout(Math.random() * 200 + 50); // Random delay between keystrokes
  }
}

/**
 * Wait with random delay to appear more human-like
 */
export async function humanWait(page: Page, min: number = 1000, max: number = 3000) {
  const delay = Math.random() * (max - min) + min;
  await page.waitForTimeout(delay);
}

/**
 * Click with random offset to appear more human-like
 */
export async function humanClick(page: Page, selector: string) {
  const element = await page.$(selector);
  if (element) {
    const box = await element.boundingBox();
    if (box) {
      // Click at a random position within the element
      const x = box.x + Math.random() * box.width;
      const y = box.y + Math.random() * box.height;
      await page.mouse.click(x, y);
    }
  }
}