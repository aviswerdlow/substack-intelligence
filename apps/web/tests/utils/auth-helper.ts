import { Page, expect } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async signIn(email: string, password: string) {
    console.log(`Signing in with email: ${email}`);
    
    await this.page.goto('/sign-in');
    
    // Wait for Clerk to load
    await this.page.waitForSelector('[data-clerk-sign-in-form]', { 
      timeout: 15000,
      state: 'visible' 
    });
    
    // Fill in credentials
    await this.page.fill('input[name="identifier"]', email);
    await this.page.fill('input[name="password"]', password);
    
    // Submit form
    await this.page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await this.page.waitForURL('**/dashboard', { timeout: 30000 });
    
    // Verify we're authenticated
    await expect(this.page).toHaveURL(/.*dashboard/);
    
    console.log('Successfully signed in');
  }

  async signUp(email: string, password: string, firstName?: string, lastName?: string) {
    console.log(`Signing up with email: ${email}`);
    
    await this.page.goto('/sign-up');
    
    // Wait for Clerk to load
    await this.page.waitForSelector('[data-clerk-sign-up-form]', { 
      timeout: 15000,
      state: 'visible' 
    });
    
    // Fill in credentials
    if (firstName) {
      await this.page.fill('input[name="firstName"]', firstName);
    }
    if (lastName) {
      await this.page.fill('input[name="lastName"]', lastName);
    }
    await this.page.fill('input[name="emailAddress"]', email);
    await this.page.fill('input[name="password"]', password);
    
    // Submit form
    await this.page.click('button[type="submit"]');
    
    // Handle email verification if required
    try {
      await this.page.waitForSelector('[data-clerk-verification-form]', { timeout: 5000 });
      console.log('Email verification required - using test bypass');
      
      // In test environment, Clerk might have verification bypass
      if (process.env.NODE_ENV === 'test') {
        // Skip verification for test environment
        await this.page.click('button[data-clerk-bypass-verification]', { timeout: 5000 });
      }
    } catch (error) {
      // Verification not required or already handled
      console.log('No email verification required');
    }
    
    // Wait for redirect to dashboard
    await this.page.waitForURL('**/dashboard', { timeout: 30000 });
    
    // Verify we're authenticated
    await expect(this.page).toHaveURL(/.*dashboard/);
    
    console.log('Successfully signed up');
  }

  async signOut() {
    console.log('Signing out...');
    
    // Look for user menu or sign out button
    const userButton = this.page.locator('[data-clerk-user-button]');
    await userButton.click();
    
    // Click sign out
    await this.page.click('button:has-text("Sign out")');
    
    // Wait for redirect to home or sign-in
    await this.page.waitForURL(/\/(sign-in|$)/, { timeout: 10000 });
    
    console.log('Successfully signed out');
  }

  async ensureAuthenticated() {
    // Check if we're already on a protected page
    const currentUrl = this.page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/settings')) {
      return; // Already authenticated
    }
    
    // Try to access dashboard
    await this.page.goto('/dashboard');
    
    // If redirected to sign-in, we're not authenticated
    if (this.page.url().includes('/sign-in')) {
      throw new Error('User is not authenticated');
    }
    
    // Wait for dashboard to load
    await this.page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
  }

  async createTestUser() {
    const timestamp = Date.now();
    const testEmail = `test.user.${timestamp}@terragon.test`;
    const testPassword = 'TestPassword123!';
    
    console.log(`Creating test user: ${testEmail}`);
    
    await this.signUp(testEmail, testPassword, 'Test', 'User');
    
    return {
      email: testEmail,
      password: testPassword,
      firstName: 'Test',
      lastName: 'User'
    };
  }

  async waitForGmailConnection() {
    // Navigate to settings email tab
    await this.page.goto('/settings?tab=email');
    
    // Wait for Gmail connection status
    const gmailStatus = this.page.locator('[data-testid="gmail-connection-status"]');
    await gmailStatus.waitFor({ state: 'visible', timeout: 10000 });
    
    // Check if Gmail is already connected
    const isConnected = await gmailStatus.textContent();
    return isConnected?.includes('Connected') || false;
  }
}