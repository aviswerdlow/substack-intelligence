import { test, expect, Page } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display sign in page', async ({ page }) => {
    await page.goto('/sign-in');
    
    // Check for Clerk Auth UI elements
    await expect(page).toHaveURL(/.*sign-in/);
    
    // Wait for Clerk to load
    await page.waitForSelector('[data-clerk-sign-in-form]', { 
      timeout: 10000,
      state: 'visible' 
    });
    
    // Verify sign in form elements are present
    const signInForm = page.locator('[data-clerk-sign-in-form]');
    await expect(signInForm).toBeVisible();
  });

  test('should display sign up page', async ({ page }) => {
    await page.goto('/sign-up');
    
    // Check for Clerk Auth UI elements
    await expect(page).toHaveURL(/.*sign-up/);
    
    // Wait for Clerk to load
    await page.waitForSelector('[data-clerk-sign-up-form]', { 
      timeout: 10000,
      state: 'visible' 
    });
    
    // Verify sign up form elements are present
    const signUpForm = page.locator('[data-clerk-sign-up-form]');
    await expect(signUpForm).toBeVisible();
  });

  test('should redirect unauthenticated users to sign in', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard');
    
    // Should redirect to sign in
    await page.waitForURL(/.*sign-in/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*sign-in/);
  });

  test('should navigate between sign in and sign up', async ({ page }) => {
    await page.goto('/sign-in');
    
    // Wait for Clerk to load
    await page.waitForSelector('[data-clerk-sign-in-form]', { 
      timeout: 10000,
      state: 'visible' 
    });
    
    // Look for sign up link
    const signUpLink = page.locator('a[href*="sign-up"]').first();
    if (await signUpLink.isVisible()) {
      await signUpLink.click();
      await expect(page).toHaveURL(/.*sign-up/);
    }
  });
});

test.describe('Authenticated User Flow', () => {
  // Mock authentication for testing protected routes
  test.use({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:3000',
          localStorage: [
            {
              name: '__clerk_db_jwt',
              value: 'mock_jwt_token'
            }
          ]
        }
      ]
    }
  });

  test.skip('should access dashboard when authenticated', async ({ page }) => {
    // This test is skipped as it requires proper Clerk authentication
    // In a real scenario, you would:
    // 1. Set up test user credentials
    // 2. Implement proper authentication flow
    // 3. Use authenticated storage state
    
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
    
    // Check for dashboard elements
    const dashboardTitle = page.locator('h1:has-text("Dashboard")');
    await expect(dashboardTitle).toBeVisible();
  });
});