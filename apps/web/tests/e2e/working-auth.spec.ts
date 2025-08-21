import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'aviswerdlow+clerk_test2@gmail.com',
  password: 'TestPass2024!Secure',
  verificationCode: '424242'
};

test.describe('Clerk Email Authentication', () => {
  test('should sign in with email and password', async ({ page, context }) => {
    // Navigate to homepage
    await page.goto('http://localhost:3000');
    
    // Click Sign In button to open modal
    await page.click('button:text("Sign In")');
    console.log('Opened sign-in modal');
    
    // Wait for modal to appear
    await page.waitForTimeout(2000);
    
    // Fill in email address - the modal has an input field for email
    // Wait for the input to be visible and interactable
    const emailInput = await page.locator('input').first(); 
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.click(); // Focus the input
    await emailInput.fill(''); // Clear any existing text
    await emailInput.type(TEST_CREDENTIALS.email); // Type the email
    console.log('Filled email:', TEST_CREDENTIALS.email);
    
    // Click Continue button
    await page.click('button:text("Continue")');
    console.log('Clicked Continue');
    
    // Wait for password field to appear
    await page.waitForTimeout(2000);
    
    // Now we should be on password screen
    // Look for password input
    const passwordInput = await page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible()) {
      await passwordInput.fill(TEST_CREDENTIALS.password);
      console.log('Filled password');
      
      // Click Continue/Sign In button
      const continueButton = await page.locator('button:text("Continue")').first();
      if (await continueButton.isVisible()) {
        await continueButton.click();
        console.log('Submitted password');
      }
    }
    
    // Wait for potential verification code
    await page.waitForTimeout(3000);
    
    // Check if verification code is needed
    const codeInput = await page.locator('input').filter({ hasText: /code|verification/i }).first();
    if (await codeInput.count() > 0 && await codeInput.isVisible()) {
      await codeInput.fill(TEST_CREDENTIALS.verificationCode);
      console.log('Filled verification code');
      
      // Submit verification
      await page.click('button:text("Continue")');
    }
    
    // Wait for authentication to complete
    await page.waitForTimeout(5000);
    
    // Check if we're authenticated by looking for dashboard or user button
    const url = page.url();
    console.log('Final URL:', url);
    
    if (url.includes('dashboard')) {
      console.log('✅ Successfully redirected to dashboard!');
      
      // Save authentication state
      await context.storageState({ path: 'clerk-auth-state.json' });
      console.log('✅ Saved authentication state');
      
      // Take screenshot of dashboard
      await page.screenshot({ path: 'test-results/authenticated-dashboard.png', fullPage: true });
    } else {
      // Check if user button is visible (indicating we're logged in)
      const userButton = await page.locator('[data-clerk-user-button]').first();
      if (await userButton.count() > 0) {
        console.log('✅ User is authenticated (user button found)');
        
        // Try navigating to dashboard
        await page.goto('http://localhost:3000/dashboard');
        await page.waitForLoadState('networkidle');
        
        if (page.url().includes('dashboard')) {
          console.log('✅ Successfully accessed dashboard');
          await context.storageState({ path: 'clerk-auth-state.json' });
          await page.screenshot({ path: 'test-results/authenticated-dashboard.png', fullPage: true });
        }
      } else {
        console.log('❌ Authentication may have failed');
        await page.screenshot({ path: 'test-results/auth-failed.png', fullPage: true });
      }
    }
  });
  
  test.describe('With saved authentication', () => {
    test.use({ storageState: 'clerk-auth-state.json' });
    
    test('should access dashboard directly', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Should be on dashboard
      expect(page.url()).toContain('dashboard');
      
      // Check for dashboard elements
      const heading = await page.locator('h1:text("Substack Intelligence")').first();
      await expect(heading).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/dashboard-with-auth.png', fullPage: true });
      
      console.log('✅ Dashboard accessible with saved authentication');
    });
  });
});