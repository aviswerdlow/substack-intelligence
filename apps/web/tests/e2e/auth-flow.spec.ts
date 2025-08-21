import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Authentication Flow - Real Testing', () => {
  test('should navigate through sign-in process', async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:3000');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of homepage
    await page.screenshot({ path: 'test-results/homepage.png' });
    
    // Click on Sign In button
    await page.click('button:has-text("Sign In")');
    
    // Wait for Clerk modal to appear
    await page.waitForTimeout(2000);
    
    // Take screenshot of sign-in modal
    await page.screenshot({ path: 'test-results/sign-in-modal.png' });
    
    // Check if modal is visible
    const modalContent = await page.evaluate(() => {
      // Check for Clerk elements
      const clerkPortal = document.querySelector('[data-clerk-portal]');
      const googleButton = document.querySelector('button:has-text("Continue with Google")');
      const signUpLink = document.querySelector('a[href*="sign-up"]');
      
      return {
        hasClerkPortal: !!clerkPortal,
        hasGoogleButton: !!googleButton,
        hasSignUpLink: !!signUpLink,
        modalText: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('Modal content:', modalContent);
    
    // Verify sign-in modal elements
    expect(modalContent.modalText).toContain('Sign in');
    
    // Test navigation to sign-up
    if (modalContent.hasSignUpLink) {
      await page.click('a:has-text("Sign up")');
      await page.waitForTimeout(1000);
      
      // Take screenshot of sign-up modal
      await page.screenshot({ path: 'test-results/sign-up-modal.png' });
      
      // Verify sign-up modal
      const signUpText = await page.textContent('body');
      expect(signUpText).toContain('Create your account');
      
      // Navigate back to sign-in
      await page.click('a:has-text("Sign in")');
      await page.waitForTimeout(1000);
    }
    
    // Test Google OAuth button
    const googleButton = await page.$('button:has-text("Continue with Google")');
    if (googleButton) {
      console.log('Google OAuth button found');
      
      // Click Google button (this will open Google OAuth)
      // Note: We won't complete the OAuth flow in automated tests
      // await googleButton.click();
    }
    
    // Close modal by clicking outside or ESC
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Verify we're back on homepage
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('should redirect to sign-in when accessing protected route', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto('http://localhost:3000/dashboard');
    
    // Should be redirected to sign-in
    await page.waitForURL('**/sign-in**');
    
    // Take screenshot of sign-in page
    await page.screenshot({ path: 'test-results/sign-in-redirect.png' });
    
    // Verify we're on sign-in page
    const url = page.url();
    expect(url).toContain('sign-in');
    
    // Check for Clerk sign-in component
    await page.waitForSelector('[data-clerk-sign-in-form]', { timeout: 10000 });
    
    const signInForm = await page.$('[data-clerk-sign-in-form]');
    expect(signInForm).toBeTruthy();
  });

  test('should display sign-in and sign-up buttons when not authenticated', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check for sign-in button
    const signInButton = await page.$('button:has-text("Sign In")');
    expect(signInButton).toBeTruthy();
    
    // Check for sign-up button
    const signUpButton = await page.$('button:has-text("Sign Up")');
    expect(signUpButton).toBeTruthy();
    
    // Should not see dashboard link when not authenticated
    const dashboardLink = await page.$('a[href="/dashboard"]');
    
    // If dashboard link exists, it should only be visible when signed in
    if (dashboardLink) {
      const isVisible = await dashboardLink.isVisible();
      expect(isVisible).toBe(false);
    }
  });

  test('should handle sign-in modal interactions', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open sign-in modal
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(2000);
    
    // Test modal is open
    const modalState = await page.evaluate(() => {
      const modal = document.querySelector('[data-clerk-portal]');
      const backdrop = document.querySelector('[data-clerk-portal-backdrop]');
      return {
        hasModal: !!modal,
        hasBackdrop: !!backdrop,
        bodyOverflow: window.getComputedStyle(document.body).overflow
      };
    });
    
    console.log('Modal state:', modalState);
    
    // Modal should be present
    expect(modalState.hasModal || modalState.hasBackdrop).toBeTruthy();
    
    // Try to close modal with ESC
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    
    // Check modal is closed
    const modalClosed = await page.evaluate(() => {
      const modal = document.querySelector('[data-clerk-portal]');
      return !modal || window.getComputedStyle(modal).display === 'none';
    });
    
    expect(modalClosed).toBeTruthy();
  });

  test.describe('Mock Authentication Flow', () => {
    test('should test authentication flow with mock data', async ({ page }) => {
      // Add mock authentication to localStorage
      await page.evaluateOnNewDocument(() => {
        // Mock Clerk user session
        localStorage.setItem('__clerk_db_jwt', JSON.stringify({
          exp: Date.now() + 3600000,
          iat: Date.now(),
          sess: 'sess_mock_123',
          sub: 'user_mock_123'
        }));
      });
      
      // Navigate to homepage
      await page.goto('http://localhost:3000');
      
      // In a real authenticated state, we would see different buttons
      // This is just demonstrating how to mock authentication
      const pageContent = await page.textContent('body');
      console.log('Page content with mock auth:', pageContent.substring(0, 200));
    });
  });
});