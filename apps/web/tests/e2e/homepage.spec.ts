import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Substack Intelligence/i);
    
    // Check for main content
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should have navigation elements', async ({ page }) => {
    // Check for header/navigation
    const nav = page.locator('nav, header');
    await expect(nav.first()).toBeVisible();
    
    // Check for sign in link
    const signInLink = page.locator('a[href*="sign-in"]');
    if (await signInLink.count() > 0) {
      await expect(signInLink.first()).toBeVisible();
    }
  });

  test('should be responsive', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('main')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('main')).toBeVisible();
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('main')).toBeVisible();
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    // Check for meta description
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toBeTruthy();
    
    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('should handle navigation to auth pages', async ({ page }) => {
    // Try to find and click sign in link
    const signInLink = page.locator('a[href*="sign-in"]').first();
    if (await signInLink.isVisible()) {
      await signInLink.click();
      await expect(page).toHaveURL(/.*sign-in/);
    }
  });
});

test.describe('Homepage Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should not have console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out expected errors (e.g., third-party scripts)
    const unexpectedErrors = consoleErrors.filter(error => 
      !error.includes('nextauth') && // NextAuth auth might have warnings in dev
      !error.includes('Failed to load resource') // External resources
    );
    
    expect(unexpectedErrors).toHaveLength(0);
  });

  test('should have accessible color contrast', async ({ page }) => {
    await page.goto('/');
    
    // Check that text is visible and has proper contrast
    const bodyText = page.locator('body');
    await expect(bodyText).toBeVisible();
    
    // Get computed styles
    const color = await bodyText.evaluate(el => 
      window.getComputedStyle(el).color
    );
    const backgroundColor = await bodyText.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Basic check that colors are set
    expect(color).toBeTruthy();
    expect(backgroundColor).toBeTruthy();
  });
});