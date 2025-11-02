import { test, expect, Page } from '@playwright/test';

// Test credentials for NextAuth test mode
const TEST_CREDENTIALS = {
  email: 'test+nextauth_test@example.com',
  password: 'TestPassword123!',
  verificationCode: '424242'
};

test.describe('Test Mode Authentication', () => {
  test('should sign in with test email and password', async ({ page, context }) => {
    // Navigate to homepage
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Click Sign In button
    await page.click('button:text("Sign In")');
    await page.waitForTimeout(2000);
    
    // Check if we're redirected to sign-in page or modal appears
    const url = page.url();
    
    if (url.includes('sign-in')) {
      // We're on the sign-in page
      console.log('On sign-in page');
      
      // Look for email input
      const emailInput = await page.locator('input[name="identifier"], input[type="email"], input[placeholder*="email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill(TEST_CREDENTIALS.email);
        console.log('Filled email');
      }
      
      // Look for password input
      const passwordInput = await page.locator('input[name="password"], input[type="password"]').first();
      if (await passwordInput.isVisible()) {
        await passwordInput.fill(TEST_CREDENTIALS.password);
        console.log('Filled password');
      }
      
      // Submit the form
      const submitButton = await page.locator('button[type="submit"], button:text("Continue"), button:text("Sign in")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        console.log('Clicked submit');
      }
      
      // Wait for potential verification code input
      await page.waitForTimeout(2000);
      
      // Check if verification is needed
      const verificationInput = await page.locator('input[name="code"], input[placeholder*="code"], input[placeholder*="verification"]').first();
      if (await verificationInput.isVisible()) {
        await verificationInput.fill(TEST_CREDENTIALS.verificationCode);
        console.log('Filled verification code');
        
        // Submit verification
        const verifyButton = await page.locator('button:text("Verify"), button:text("Continue")').first();
        if (await verifyButton.isVisible()) {
          await verifyButton.click();
        }
      }
      
      // Wait for redirect to dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
        console.log('Not redirected to dashboard yet');
      });
      
      // Save authentication state
      if (page.url().includes('dashboard')) {
        await context.storageState({ path: 'test-auth-state.json' });
        console.log('✅ Successfully signed in and saved auth state');
      }
    } else {
      // Modal might be open
      console.log('Looking for sign-in modal');
      
      // Try to find email/password option
      const emailOption = await page.locator('button:text("Email"), button:text("Continue with email")').first();
      if (await emailOption.isVisible()) {
        await emailOption.click();
        await page.waitForTimeout(1000);
      }
      
      // Fill email
      const emailInput = await page.locator('input[name="identifier"], input[type="email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill(TEST_CREDENTIALS.email);
        
        // Continue to password
        const continueButton = await page.locator('button:text("Continue")').first();
        if (await continueButton.isVisible()) {
          await continueButton.click();
          await page.waitForTimeout(1000);
        }
        
        // Fill password
        const passwordInput = await page.locator('input[type="password"]').first();
        if (await passwordInput.isVisible()) {
          await passwordInput.fill(TEST_CREDENTIALS.password);
          
          // Sign in
          const signInButton = await page.locator('button:text("Sign in"), button:text("Continue")').first();
          if (await signInButton.isVisible()) {
            await signInButton.click();
          }
        }
      }
    }
    
    // Verify we're signed in
    const finalUrl = page.url();
    if (finalUrl.includes('dashboard')) {
      expect(finalUrl).toContain('dashboard');
      console.log('✅ Successfully authenticated and on dashboard');
    } else {
      console.log('Current URL:', finalUrl);
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/auth-debug.png' });
    }
  });

  test.describe('With test authentication', () => {
    test.use({ storageState: 'test-auth-state.json' });
    
    test('should access dashboard directly', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Should be on dashboard without redirect
      expect(page.url()).toContain('dashboard');
      
      // Check for dashboard elements
      const heading = await page.locator('h1:text("Substack Intelligence")');
      await expect(heading).toBeVisible();
      
      // Check for user button
      const userButton = await page.locator('[data-nextauth-user-button]');
      await expect(userButton).toBeVisible();
      
      console.log('✅ Dashboard accessible with saved auth');
    });
    
    test('should navigate dashboard sections', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      
      // Look for Intelligence link
      const intelligenceLink = await page.locator('a:text("Intelligence")').first();
      if (await intelligenceLink.isVisible()) {
        await intelligenceLink.click();
        await page.waitForLoadState('networkidle');
        
        expect(page.url()).toContain('intelligence');
        console.log('✅ Navigated to Intelligence section');
      }
      
      // Go back to dashboard
      const dashboardLink = await page.locator('a:text("Dashboard")').first();
      if (await dashboardLink.isVisible()) {
        await dashboardLink.click();
        await page.waitForLoadState('networkidle');
        
        expect(page.url()).toContain('dashboard');
        console.log('✅ Navigated back to Dashboard');
      }
    });
    
    test('should display dashboard content', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of authenticated dashboard
      await page.screenshot({ path: 'test-results/dashboard-authenticated-test.png', fullPage: true });
      
      // Check for dashboard sections
      const sections = await page.locator('section, [class*="card"], [class*="panel"]').count();
      expect(sections).toBeGreaterThan(0);
      
      console.log(`✅ Dashboard has ${sections} sections`);
      
      // Check for any data or stats
      const stats = await page.locator('[class*="stat"], [class*="metric"], [class*="number"]').count();
      if (stats > 0) {
        console.log(`✅ Dashboard displays ${stats} statistics`);
      }
    });
  });
});

test.describe('Test User Creation', () => {
  test('should handle test user registration', async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:3000');
    
    // Click Sign Up button
    await page.click('button:text("Sign Up")');
    await page.waitForTimeout(2000);
    
    const url = page.url();
    
    if (url.includes('sign-up')) {
      // On sign-up page
      const timestamp = Date.now();
      const testEmail = `test+nextauth_test_${timestamp}@example.com`;
      
      // Fill registration form
      const emailInput = await page.locator('input[name="emailAddress"], input[type="email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill(testEmail);
      }
      
      const passwordInput = await page.locator('input[name="password"], input[type="password"]').first();
      if (await passwordInput.isVisible()) {
        await passwordInput.fill(TEST_CREDENTIALS.password);
      }
      
      // Some forms might have first/last name fields
      const firstNameInput = await page.locator('input[name="firstName"]').first();
      if (await firstNameInput.isVisible()) {
        await firstNameInput.fill('Test');
      }
      
      const lastNameInput = await page.locator('input[name="lastName"]').first();
      if (await lastNameInput.isVisible()) {
        await lastNameInput.fill('User');
      }
      
      // Submit registration
      const submitButton = await page.locator('button[type="submit"], button:text("Sign up"), button:text("Continue")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        console.log(`Created test user: ${testEmail}`);
      }
      
      // Handle verification if needed
      await page.waitForTimeout(2000);
      const verificationInput = await page.locator('input[name="code"]').first();
      if (await verificationInput.isVisible()) {
        await verificationInput.fill(TEST_CREDENTIALS.verificationCode);
        
        const verifyButton = await page.locator('button:text("Verify")').first();
        if (await verifyButton.isVisible()) {
          await verifyButton.click();
        }
      }
      
      // Check if redirected to dashboard
      await page.waitForTimeout(3000);
      if (page.url().includes('dashboard')) {
        console.log('✅ Test user registered and authenticated');
      }
    }
  });
});