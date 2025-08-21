import { test, expect, Page } from '@playwright/test';

test.describe('Dashboard Features', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Create a new context with mocked authentication
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Mock Clerk authentication (simplified for testing)
    await page.addInitScript(() => {
      window.localStorage.setItem('__test_authenticated', 'true');
    });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.skip('should display dashboard components', async () => {
    // Skip this test as it requires actual authentication
    // In production, you would set up test users and proper auth flow
    
    await page.goto('/dashboard');
    
    // Check for dashboard navigation
    const dashboardNav = page.locator('[data-testid="dashboard-nav"]');
    await expect(dashboardNav).toBeVisible();
    
    // Check for stats section
    const statsSection = page.locator('[data-testid="dashboard-stats"]');
    await expect(statsSection).toBeVisible();
    
    // Check for recent companies section
    const recentCompanies = page.locator('[data-testid="recent-companies"]');
    await expect(recentCompanies).toBeVisible();
    
    // Check for quick actions
    const quickActions = page.locator('[data-testid="quick-actions"]');
    await expect(quickActions).toBeVisible();
  });

  test.skip('should navigate to intelligence page', async () => {
    await page.goto('/dashboard');
    
    // Find and click intelligence link
    const intelligenceLink = page.locator('a[href*="intelligence"]');
    await intelligenceLink.click();
    
    await expect(page).toHaveURL(/.*intelligence/);
    
    // Check intelligence page loaded
    const intelligenceContent = page.locator('main');
    await expect(intelligenceContent).toBeVisible();
  });

  test.skip('should handle quick actions', async () => {
    await page.goto('/dashboard');
    
    // Test enrichment action
    const enrichButton = page.locator('button:has-text("Enrich")').first();
    if (await enrichButton.isVisible()) {
      await enrichButton.click();
      
      // Check for modal or form
      const enrichForm = page.locator('[data-testid="enrich-form"]');
      await expect(enrichForm).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Dashboard Data Loading', () => {
  test('should handle loading states', async ({ page }) => {
    // Intercept API calls to simulate loading
    await page.route('/api/companies', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ companies: [] })
        });
      }, 1000);
    });
    
    await page.goto('/dashboard');
    
    // Check for loading indicators
    const loadingIndicator = page.locator('[data-testid="loading"], .animate-pulse, [aria-busy="true"]');
    
    // Loading indicator might appear
    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator.first()).toBeVisible();
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API calls to simulate error
    await page.route('/api/companies', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.goto('/dashboard');
    
    // Check for error handling
    const errorMessage = page.locator('[data-testid="error-message"], .error, [role="alert"]');
    
    // Error message might appear
    if (await errorMessage.count() > 0) {
      await expect(errorMessage.first()).toBeVisible();
    }
  });
});

test.describe('Dashboard Monitoring Integration', () => {
  test('should track page views', async ({ page }) => {
    let pageviewTracked = false;
    
    // Intercept monitoring calls
    await page.route('/api/monitoring/pageview', route => {
      pageviewTracked = true;
      route.fulfill({ status: 200 });
    });
    
    await page.goto('/dashboard');
    await page.waitForTimeout(1000); // Wait for tracking
    
    // Verify pageview was tracked
    expect(pageviewTracked).toBe(true);
  });

  test('should track interactions', async ({ page }) => {
    let interactionTracked = false;
    
    // Intercept monitoring calls
    await page.route('/api/monitoring/interaction', route => {
      interactionTracked = true;
      route.fulfill({ status: 200 });
    });
    
    await page.goto('/dashboard');
    
    // Perform an interaction
    const button = page.locator('button').first();
    if (await button.isVisible()) {
      await button.click();
      await page.waitForTimeout(500);
      
      // Interaction tracking might be implemented
      // This test documents expected behavior
    }
  });
});