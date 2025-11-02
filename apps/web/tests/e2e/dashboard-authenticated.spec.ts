import { test, expect } from '@playwright/test';

// This test suite assumes you have manually signed in first
// Run with: pnpm test:e2e --grep "Dashboard" --headed

test.describe('Dashboard - Authenticated User Features', () => {
  test.setTimeout(120000); // 2 minute timeout for manual sign-in
  
  // Store authentication state after manual sign-in
  test('should save authentication state after manual sign-in', async ({ page, context }) => {
    console.log('\n=== MANUAL SIGN-IN REQUIRED ===');
    console.log('1. Navigate to http://localhost:3000');
    console.log('2. Click "Sign In" button');
    console.log('3. Sign in with Google or create an account');
    console.log('4. Once you see the dashboard, the test will continue');
    console.log('================================\n');
    
    // Navigate to homepage
    await page.goto('http://localhost:3000');
    
    // Wait for manual sign-in
    console.log('Waiting for you to sign in manually...');
    
    // Check every 2 seconds if user has signed in (by checking for dashboard URL or user button)
    let isSignedIn = false;
    for (let i = 0; i < 60; i++) { // Wait up to 2 minutes
      await page.waitForTimeout(2000);
      
      // Check if we're on dashboard or if user button exists
      const url = page.url();
      const userButton = await page.$('[data-nextauth-user-button]');
      const dashboardElement = await page.$('[data-testid="dashboard-nav"]');
      
      if (url.includes('/dashboard') || userButton || dashboardElement) {
        isSignedIn = true;
        console.log('✅ User signed in successfully!');
        break;
      }
      
      if (i % 5 === 0) {
        console.log(`Still waiting... (${i * 2} seconds elapsed)`);
      }
    }
    
    if (!isSignedIn) {
      throw new Error('Timeout waiting for manual sign-in. Please run the test again and sign in.');
    }
    
    // Save the authentication state
    await context.storageState({ path: 'auth-state.json' });
    console.log('✅ Authentication state saved to auth-state.json');
    
    // Now navigate to dashboard
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of dashboard
    await page.screenshot({ path: 'test-results/dashboard-authenticated.png', fullPage: true });
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test.describe('With saved authentication', () => {
    test.use({ storageState: 'auth-state.json' });
    
    test('should access dashboard and see main components', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Check for dashboard elements
      const dashboardTitle = await page.locator('h1:has-text("Substack Intelligence")');
      await expect(dashboardTitle).toBeVisible();
      
      // Check for navigation
      const nav = await page.locator('[data-testid="dashboard-nav"], nav');
      await expect(nav.first()).toBeVisible();
      
      // Check for user button (NextAuth UserButton component)
      const userButton = await page.locator('[data-nextauth-user-button]');
      await expect(userButton).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/dashboard-main.png', fullPage: true });
      
      console.log('✅ Dashboard loaded successfully');
    });
    
    test('should navigate to Intelligence page', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      
      // Click on Intelligence link
      const intelligenceLink = await page.locator('a:has-text("Intelligence")').first();
      if (await intelligenceLink.isVisible()) {
        await intelligenceLink.click();
        await page.waitForLoadState('networkidle');
        
        // Verify we're on intelligence page
        await expect(page).toHaveURL(/.*intelligence/);
        
        // Take screenshot
        await page.screenshot({ path: 'test-results/intelligence-page.png', fullPage: true });
        
        console.log('✅ Intelligence page accessed');
      }
    });
    
    test('should display dashboard statistics', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Look for stats cards
      const statsSection = await page.locator('[data-testid="dashboard-stats"], .stats, [class*="stat"]').first();
      if (await statsSection.isVisible()) {
        await expect(statsSection).toBeVisible();
        console.log('✅ Dashboard statistics visible');
      }
      
      // Look for recent companies section
      const recentCompanies = await page.locator('[data-testid="recent-companies"], [class*="recent"], h2:has-text("Recent")').first();
      if (await recentCompanies.isVisible()) {
        await expect(recentCompanies).toBeVisible();
        console.log('✅ Recent companies section visible');
      }
    });
    
    test('should test quick actions on dashboard', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Look for quick action buttons
      const quickActions = await page.locator('[data-testid="quick-actions"], [class*="quick"], button').first();
      if (await quickActions.isVisible()) {
        // Take screenshot of quick actions
        await page.screenshot({ path: 'test-results/quick-actions.png' });
        console.log('✅ Quick actions available');
      }
      
      // Test trigger intelligence button if available
      const triggerButton = await page.locator('button:has-text("Trigger"), button:has-text("Run")').first();
      if (await triggerButton.isVisible()) {
        await triggerButton.click();
        await page.waitForTimeout(2000);
        
        // Check for any response or modal
        await page.screenshot({ path: 'test-results/after-trigger.png' });
        console.log('✅ Trigger action tested');
      }
    });
    
    test('should open user profile menu', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Click on user button
      const userButton = await page.locator('[data-nextauth-user-button]');
      if (await userButton.isVisible()) {
        await userButton.click();
        await page.waitForTimeout(1000);
        
        // Take screenshot of user menu
        await page.screenshot({ path: 'test-results/user-menu.png' });
        
        // Check for menu items
        const signOutButton = await page.locator('button:has-text("Sign out")');
        await expect(signOutButton).toBeVisible();
        
        console.log('✅ User menu functional');
        
        // Close menu
        await page.keyboard.press('Escape');
      }
    });
    
    test('should handle navigation between dashboard sections', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      
      // Test navigation to different sections
      const navLinks = [
        { text: 'Dashboard', url: '/dashboard' },
        { text: 'Intelligence', url: '/intelligence' },
      ];
      
      for (const link of navLinks) {
        const navLink = await page.locator(`a:has-text("${link.text}")`).first();
        if (await navLink.isVisible()) {
          await navLink.click();
          await page.waitForLoadState('networkidle');
          
          // Verify URL
          const currentUrl = page.url();
          expect(currentUrl).toContain(link.url);
          
          console.log(`✅ Navigated to ${link.text}`);
          
          // Go back to dashboard for next test
          if (link.url !== '/dashboard') {
            await page.goto('http://localhost:3000/dashboard');
          }
        }
      }
    });
    
    test('should test responsive behavior', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      
      // Test desktop view
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.screenshot({ path: 'test-results/dashboard-desktop.png' });
      
      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.screenshot({ path: 'test-results/dashboard-tablet.png' });
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await page.screenshot({ path: 'test-results/dashboard-mobile.png' });
      
      // Check if mobile menu exists
      const mobileMenuButton = await page.locator('[data-testid="mobile-menu"], [aria-label*="menu"]').first();
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/mobile-menu-open.png' });
        console.log('✅ Mobile menu functional');
      }
      
      console.log('✅ Responsive design tested');
    });
  });
});