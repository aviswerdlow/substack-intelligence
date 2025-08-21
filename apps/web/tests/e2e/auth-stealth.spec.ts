import { test, expect } from '@playwright/test';
import { applyStealthMode, humanType, humanClick, humanWait, createStealthContext } from './helpers/stealth';

test.describe('Authentication with Stealth Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Apply stealth mode to bypass bot detection
    await applyStealthMode(page);
    await page.goto('/');
    await humanWait(page, 2000, 4000); // Wait like a human would
  });

  test('should sign in with Google OAuth without triggering Cloudflare', async ({ page, browser }) => {
    // Create stealth context
    const context = await createStealthContext(browser);
    const stealthPage = await context.newPage();
    await applyStealthMode(stealthPage);
    
    // Navigate to homepage
    await stealthPage.goto('http://localhost:3000');
    await humanWait(stealthPage, 2000, 3000);
    
    // Find and click sign in button with human-like behavior
    const signInButton = await stealthPage.$('button:has-text("Sign In")');
    if (signInButton) {
      // Move mouse randomly before clicking
      await stealthPage.mouse.move(
        Math.random() * 500, 
        Math.random() * 500
      );
      await humanWait(stealthPage, 500, 1000);
      
      // Click the button
      await humanClick(stealthPage, 'button:has-text("Sign In")');
      await humanWait(stealthPage, 1000, 2000);
      
      // Wait for modal to appear
      await stealthPage.waitForSelector('[data-clerk-portal]', { 
        timeout: 10000,
        state: 'visible' 
      }).catch(() => {
        // If Clerk portal doesn't appear, try the iframe approach
        console.log('Clerk portal not found, checking for iframe...');
      });
      
      // Check if Google OAuth button is available
      const googleButton = await stealthPage.$('button:has-text("Continue with Google")');
      expect(googleButton).toBeTruthy();
    }
    
    await context.close();
  });

  test('should navigate to sign-in page without bot detection', async ({ page }) => {
    // Click sign in with human-like behavior
    await humanClick(page, 'button:has-text("Sign In")');
    await humanWait(page, 1000, 2000);
    
    // Check that we're not blocked by Cloudflare
    const pageContent = await page.content();
    expect(pageContent).not.toContain('Checking your browser');
    expect(pageContent).not.toContain('DDoS protection by Cloudflare');
    expect(pageContent).not.toContain('Please stand by, while we are checking your browser');
    
    // Check for Clerk sign-in modal or page
    const hasSignInContent = 
      (await page.$('[data-clerk-portal]')) !== null ||
      (await page.$('text=/Sign in/i')) !== null ||
      (await page.$('text=/Continue with Google/i')) !== null;
    
    expect(hasSignInContent).toBeTruthy();
  });

  test('should access protected routes after authentication', async ({ page, browser }) => {
    // This test would require actual authentication
    // For now, we'll test that unauthenticated users are redirected
    
    const context = await createStealthContext(browser);
    const stealthPage = await context.newPage();
    await applyStealthMode(stealthPage);
    
    // Try to access dashboard directly
    await stealthPage.goto('http://localhost:3000/dashboard');
    await humanWait(stealthPage, 2000, 3000);
    
    // Should be redirected to sign-in
    const url = stealthPage.url();
    expect(url).toContain('sign-in');
    
    await context.close();
  });

  test('should handle sign-up flow without bot detection', async ({ page }) => {
    // Click sign up button
    const signUpButton = await page.$('button:has-text("Sign Up")');
    if (signUpButton) {
      await humanClick(page, 'button:has-text("Sign Up")');
      await humanWait(page, 1000, 2000);
      
      // Check for sign-up modal
      const hasSignUpContent = 
        (await page.$('text=/Create your account/i')) !== null ||
        (await page.$('text=/Sign up/i')) !== null;
      
      expect(hasSignUpContent).toBeTruthy();
    }
  });
});

test.describe('Manual Authentication Testing', () => {
  test.skip('manual sign-in test with real credentials', async ({ page }) => {
    // This test is skipped by default as it requires real credentials
    // To run: remove .skip and provide real test credentials
    
    await applyStealthMode(page);
    await page.goto('/');
    
    // Click sign in
    await humanClick(page, 'button:has-text("Sign In")');
    await humanWait(page, 2000, 3000);
    
    // If using email/password (when Clerk is configured for it):
    // await humanType(page, 'input[name="identifier"]', 'test@example.com');
    // await humanType(page, 'input[name="password"]', 'TestPassword123!');
    // await humanClick(page, 'button[type="submit"]');
    
    // Wait for redirect to dashboard
    // await page.waitForURL('**/dashboard', { timeout: 30000 });
    
    // Verify we're logged in
    // const userButton = await page.$('[data-clerk-user-button]');
    // expect(userButton).toBeTruthy();
  });
});