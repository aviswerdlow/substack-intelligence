import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth-helper';

test.describe('Comprehensive Authentication Flow', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test.describe('Sign Up Journey', () => {
    test('should complete full sign up flow', async ({ page }) => {
      const timestamp = Date.now();
      const testEmail = `test.signup.${timestamp}@terragon.test`;
      const testPassword = 'TestPassword123!';

      // Navigate to sign up
      await page.goto('/');
      await page.click('text=Sign Up');
      
      // Verify we're on sign up page
      await expect(page).toHaveURL(/.*sign-up/);
      
      // Wait for form to load
      await page.waitForSelector('[data-nextauth-sign-up-form]', { timeout: 15000 });
      
      // Fill out form
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="emailAddress"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Handle email verification or redirect
      try {
        // In test environment, might skip verification
        await page.waitForURL('**/dashboard', { timeout: 30000 });
      } catch (error) {
        // Handle verification flow if needed
        const verificationForm = page.locator('[data-nextauth-verification-form]');
        if (await verificationForm.isVisible()) {
          // Skip verification in test environment
          console.log('Email verification detected - handling in test mode');
        }
      }
      
      // Verify successful sign up
      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 10000 });
    });

    test('should show validation errors for invalid data', async ({ page }) => {
      await page.goto('/sign-up');
      await page.waitForSelector('[data-nextauth-sign-up-form]', { timeout: 15000 });
      
      // Try to submit with invalid email
      await page.fill('input[name="emailAddress"]', 'invalid-email');
      await page.fill('input[name="password"]', '123'); // Too short
      await page.click('button[type="submit"]');
      
      // Should show validation errors
      await expect(page.locator('text=Invalid email')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Password must be')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Sign In Journey', () => {
    test('should complete sign in flow with test credentials', async ({ page }) => {
      // Skip if no test credentials
      if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
        test.skip('No test credentials provided');
      }

      await authHelper.signIn(process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!);
      
      // Verify dashboard loads
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForSelector('[data-nextauth-sign-in-form]', { timeout: 15000 });
      
      // Try invalid credentials
      await page.fill('input[name="identifier"]', 'invalid@test.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 10000 });
    });

    test('should remember user session', async ({ page, context }) => {
      // Skip if no test credentials
      if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
        test.skip('No test credentials provided');
      }

      // Sign in
      await authHelper.signIn(process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!);
      
      // Close page and open new one
      await page.close();
      const newPage = await context.newPage();
      
      // Navigate to protected route
      await newPage.goto('/dashboard');
      
      // Should still be authenticated
      await expect(newPage).toHaveURL(/.*dashboard/);
      await expect(newPage.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
      
      await newPage.close();
    });
  });

  test.describe('Protected Route Access', () => {
    const protectedRoutes = [
      '/dashboard',
      '/settings',
      '/reports',
      '/analytics',
      '/intelligence',
      '/emails'
    ];

    protectedRoutes.forEach(route => {
      test(`should redirect ${route} to sign in when unauthenticated`, async ({ page }) => {
        await page.goto(route);
        await page.waitForURL(/.*sign-in/, { timeout: 10000 });
        await expect(page).toHaveURL(/.*sign-in/);
      });
    });

    test('should allow access to protected routes when authenticated', async ({ page }) => {
      // Skip if no test credentials
      if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
        test.skip('No test credentials provided');
      }

      await authHelper.signIn(process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!);
      
      // Test each protected route
      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(new RegExp(`.*${route}`));
        
        // Verify page loads (no redirect to sign-in)
        await page.waitForTimeout(2000); // Give time for potential redirect
        await expect(page).toHaveURL(new RegExp(`.*${route}`));
      }
    });
  });

  test.describe('Sign Out Flow', () => {
    test('should sign out and clear session', async ({ page }) => {
      // Skip if no test credentials
      if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
        test.skip('No test credentials provided');
      }

      // Sign in first
      await authHelper.signIn(process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!);
      
      // Sign out
      await authHelper.signOut();
      
      // Try to access protected route
      await page.goto('/dashboard');
      
      // Should be redirected to sign in
      await page.waitForURL(/.*sign-in/, { timeout: 10000 });
      await expect(page).toHaveURL(/.*sign-in/);
    });
  });

  test.describe('Session Management', () => {
    test('should handle session expiration gracefully', async ({ page }) => {
      // Skip if no test credentials
      if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
        test.skip('No test credentials provided');
      }

      await authHelper.signIn(process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!);
      
      // Simulate session expiration by clearing storage
      await page.context().clearCookies();
      await page.evaluate(() => localStorage.clear());
      await page.evaluate(() => sessionStorage.clear());
      
      // Try to access protected route
      await page.goto('/dashboard');
      
      // Should redirect to sign in
      await page.waitForURL(/.*sign-in/, { timeout: 10000 });
      await expect(page).toHaveURL(/.*sign-in/);
    });

    test('should maintain authentication across page refreshes', async ({ page }) => {
      // Skip if no test credentials
      if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
        test.skip('No test credentials provided');
      }

      await authHelper.signIn(process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!);
      
      // Refresh the page
      await page.reload();
      
      // Should still be on dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('User Profile Access', () => {
    test('should display user information when authenticated', async ({ page }) => {
      // Skip if no test credentials
      if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
        test.skip('No test credentials provided');
      }

      await authHelper.signIn(process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!);
      
      // Look for user menu or profile information
      const userButton = page.locator('[data-nextauth-user-button]');
      if (await userButton.isVisible()) {
        await userButton.click();
        
        // Should show user email or profile info
        await expect(page.locator(`text=${process.env.TEST_USER_EMAIL}`)).toBeVisible({ timeout: 5000 });
      }
    });
  });
});