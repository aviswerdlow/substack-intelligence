import { test, expect } from '@playwright/test';

// INSTRUCTIONS:
// 1. First, sign in manually at http://localhost:3000 in your regular browser
// 2. Make sure you can see the dashboard
// 3. Then run this test: pnpm test:e2e --grep "Dashboard Simple" --project=chromium

test.describe('Dashboard Simple Tests - Requires Manual Sign In First', () => {
  test.beforeEach(async ({ page }) => {
    // Set a cookie or localStorage to bypass auth check
    // This is a workaround since we can't automate Google OAuth
    await page.goto('http://localhost:3000');
    
    // Try to inject a mock session (this may not work with NextAuth's security)
    await page.evaluate(() => {
      // Mock authenticated state
      localStorage.setItem('__test_mode', 'authenticated');
    });
  });

  test('should test the homepage elements', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/homepage-test.png', fullPage: true });
    
    // Check for main elements
    const title = await page.locator('h1').first();
    await expect(title).toBeVisible();
    
    // Check for buttons
    const buttons = await page.locator('button').count();
    console.log(`Found ${buttons} buttons on homepage`);
    
    // Check page content
    const pageContent = await page.textContent('body');
    console.log('Page contains:', pageContent?.substring(0, 200));
  });

  test('should try to access dashboard (will redirect if not authenticated)', async ({ page }) => {
    // Try to go directly to dashboard
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    
    // Take screenshot of where we end up
    await page.screenshot({ path: 'test-results/dashboard-attempt.png', fullPage: true });
    
    const url = page.url();
    console.log('Current URL:', url);
    
    if (url.includes('dashboard')) {
      console.log('✅ Successfully accessed dashboard (user must be authenticated)');
      
      // Test dashboard elements
      const heading = await page.locator('h1, h2').first();
      if (heading) {
        const headingText = await heading.textContent();
        console.log('Dashboard heading:', headingText);
      }
    } else if (url.includes('sign-in')) {
      console.log('❌ Redirected to sign-in (not authenticated)');
    }
  });

  test('should test navigation links', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Find all links
    const links = await page.locator('a').all();
    console.log(`Found ${links.length} links`);
    
    for (const link of links.slice(0, 5)) { // Test first 5 links
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      console.log(`Link: "${text}" -> ${href}`);
    }
  });

  test('should test responsive design', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: 'test-results/responsive-desktop.png' });
    
    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: 'test-results/responsive-tablet.png' });
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: 'test-results/responsive-mobile.png' });
    
    console.log('✅ Responsive screenshots captured');
  });
});

// Alternative: Test with mock authentication
test.describe('Mock Authentication Tests', () => {
  test('should test with simulated authentication', async ({ page }) => {
    // Override NextAuth's auth check (this is a hack and may not work)
    await page.addInitScript(() => {
      // Try to mock NextAuth's internal state
      window.__nextauth_db_jwt = 'mock_token';
      window.__nextauth_session = {
        id: 'sess_mock',
        userId: 'user_mock',
        status: 'active'
      };
    });
    
    await page.goto('http://localhost:3000');
    
    // Check current state
    const bodyText = await page.textContent('body');
    console.log('Page state with mock auth:', bodyText?.substring(0, 300));
    
    // Try dashboard
    await page.goto('http://localhost:3000/dashboard');
    const dashboardUrl = page.url();
    console.log('Dashboard URL with mock auth:', dashboardUrl);
  });
});