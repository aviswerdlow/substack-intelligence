import { Page } from '@playwright/test';

/**
 * Helper function to authenticate a user for testing
 * This is a placeholder - in production, you would:
 * 1. Use Clerk's test mode or development keys
 * 2. Create test users programmatically
 * 3. Store authentication state for reuse
 */
export async function authenticateUser(page: Page, email?: string, password?: string) {
  // For testing with Clerk, you might use:
  // - Development instance with test users
  // - Mock authentication tokens
  // - Clerk's testing utilities
  
  const testEmail = email || process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = password || process.env.TEST_USER_PASSWORD || 'TestPassword123!';
  
  // Navigate to sign in page
  await page.goto('/sign-in');
  
  // Wait for Clerk to load
  await page.waitForSelector('[data-clerk-sign-in-form]', { 
    timeout: 10000,
    state: 'visible' 
  });
  
  // Fill in credentials (adjust selectors based on actual Clerk UI)
  await page.fill('input[name="identifier"]', testEmail);
  await page.fill('input[name="password"]', testPassword);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

/**
 * Save authentication state for reuse across tests
 */
export async function saveAuthState(page: Page, path: string) {
  await page.context().storageState({ path });
}

/**
 * Create a mock authenticated context for testing
 * Use this when you don't have real test users set up
 */
export async function createMockAuthContext(page: Page) {
  // Add mock authentication tokens to localStorage
  await page.addInitScript(() => {
    // Mock Clerk session
    window.localStorage.setItem('__clerk_db_jwt', JSON.stringify({
      exp: Date.now() + 3600000, // 1 hour from now
      iat: Date.now(),
      sess: 'mock_session_id',
      sub: 'user_test_123'
    }));
    
    // Mock user data
    window.localStorage.setItem('__clerk_user', JSON.stringify({
      id: 'user_test_123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      profileImageUrl: null
    }));
  });
}

/**
 * Wait for dashboard to be fully loaded
 */
export async function waitForDashboard(page: Page) {
  await page.waitForURL('/dashboard');
  await page.waitForLoadState('networkidle');
  
  // Wait for key dashboard elements
  await page.waitForSelector('[data-testid="dashboard-nav"], nav', { 
    timeout: 10000,
    state: 'visible' 
  });
}