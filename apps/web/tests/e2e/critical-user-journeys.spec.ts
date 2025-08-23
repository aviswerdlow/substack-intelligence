import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth-helper';
import { DatabaseHelper } from '../utils/database-helper';

test.describe('Critical User Journeys - Pre-Commit Validation', () => {
  let authHelper: AuthHelper;
  let dbHelper: DatabaseHelper;
  let testUserId: string;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    dbHelper = new DatabaseHelper();
  });

  test.afterEach(async () => {
    if (testUserId) {
      await dbHelper.cleanTestData();
    }
  });

  test('Critical Path: New User Complete Journey', async ({ page }) => {
    console.log('🚀 Starting critical user journey test...');
    
    // 1. User Registration
    console.log('📝 Testing user registration...');
    const testUser = await authHelper.createTestUser();
    testUserId = testUser.email;
    
    // 2. Dashboard Access
    console.log('📊 Testing dashboard access...');
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // 3. Onboarding Visibility
    console.log('🎯 Testing onboarding checklist...');
    const onboardingChecklist = page.locator('[data-testid="onboarding-checklist"]');
    if (await onboardingChecklist.isVisible({ timeout: 10000 })) {
      await expect(onboardingChecklist).toBeVisible();
    } else {
      console.log('ℹ️ Onboarding checklist not visible (might be completed)');
    }
    
    // 4. Settings Access
    console.log('⚙️ Testing settings access...');
    await page.goto('/settings');
    await page.waitForSelector('[data-testid="settings"]', { timeout: 15000 });
    await expect(page).toHaveURL(/.*settings/);
    
    // 5. Email Tab Navigation
    console.log('📧 Testing email settings...');
    await page.goto('/settings?tab=email');
    await page.waitForSelector('[data-testid="settings-email-tab"]', { timeout: 10000 });
    
    // 6. Gmail Connection Status Check
    console.log('🔗 Testing Gmail connection status...');
    const gmailStatus = page.locator('[data-testid="gmail-connection-status"]');
    if (await gmailStatus.isVisible({ timeout: 5000 })) {
      const statusText = await gmailStatus.textContent();
      expect(statusText).toMatch(/(Connected|Disconnected|Not Connected)/);
    }
    
    // 7. Emails Page Access
    console.log('📨 Testing emails page...');
    await page.goto('/emails');
    await page.waitForSelector('[data-testid="email-list"]', { timeout: 15000 });
    await expect(page).toHaveURL(/.*emails/);
    
    // 8. Companies Page Access
    console.log('🏢 Testing companies page...');
    await page.goto('/companies');
    await page.waitForTimeout(5000); // Allow page to load
    await expect(page).toHaveURL(/.*companies/);
    
    // 9. Reports Page Access
    console.log('📊 Testing reports page...');
    await page.goto('/reports');
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/.*reports/);
    
    // 10. Analytics Page Access
    console.log('📈 Testing analytics page...');
    await page.goto('/analytics');
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/.*analytics/);
    
    console.log('✅ Critical user journey completed successfully!');
  });

  test('Critical Path: No Dummy Data Validation', async ({ page }) => {
    console.log('🔍 Starting dummy data validation...');
    
    // Create test user and seed some data
    const testUser = await authHelper.createTestUser();
    testUserId = testUser.email;
    
    await dbHelper.seedTestData(testUserId);
    
    // Check various pages for dummy data
    const pagesToCheck = [
      { url: '/emails', listSelector: '[data-testid="email-list"]' },
      { url: '/companies', listSelector: '[data-testid="company-list"]' },
      { url: '/dashboard', listSelector: '[data-testid="dashboard"]' },
      { url: '/analytics', listSelector: '[data-testid="analytics"]' }
    ];
    
    const dummyPatterns = [
      'example.com',
      'test@example.com', 
      'dummy',
      'placeholder',
      'lorem ipsum',
      'sample data',
      'fake company',
      'acme corp'
    ];
    
    for (const pageInfo of pagesToCheck) {
      console.log(`🔎 Checking ${pageInfo.url} for dummy data...`);
      
      await page.goto(pageInfo.url);
      await page.waitForTimeout(5000); // Allow content to load
      
      const pageContent = await page.textContent('body');
      
      for (const pattern of dummyPatterns) {
        expect(pageContent?.toLowerCase()).not.toContain(pattern.toLowerCase());
      }
    }
    
    console.log('✅ No dummy data found - validation passed!');
  });

  test('Critical Path: Basic Pipeline Functionality', async ({ page }) => {
    console.log('⚡ Testing basic pipeline functionality...');
    
    const testUser = await authHelper.createTestUser();
    testUserId = testUser.email;
    
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
    
    // Look for pipeline controls
    const runPipelineButton = page.locator('button:has-text("Run Pipeline")');
    const pipelineStatus = page.locator('[data-testid="pipeline-status"]');
    
    // If pipeline controls exist, test them
    if (await runPipelineButton.isVisible({ timeout: 5000 })) {
      console.log('🔄 Pipeline controls found, testing...');
      
      await runPipelineButton.click();
      await page.waitForTimeout(3000);
      
      if (await pipelineStatus.isVisible({ timeout: 5000 })) {
        const statusText = await pipelineStatus.textContent();
        expect(statusText?.toLowerCase()).toMatch(/(running|completed|processing|queued)/);
      }
    } else {
      console.log('ℹ️ Pipeline controls not visible (might require Gmail connection)');
    }
    
    console.log('✅ Pipeline functionality check completed!');
  });

  test('Critical Path: Data Persistence Validation', async ({ page }) => {
    console.log('💾 Testing data persistence...');
    
    const testUser = await authHelper.createTestUser();
    testUserId = testUser.email;
    
    // Navigate to settings and change a setting
    await page.goto('/settings');
    await page.waitForSelector('[data-testid="settings"]', { timeout: 15000 });
    
    // Try to find and modify a setting
    const toggleSetting = page.locator('input[type="checkbox"]').first();
    if (await toggleSetting.isVisible({ timeout: 5000 })) {
      const initialState = await toggleSetting.isChecked();
      await toggleSetting.click();
      
      // Save if save button exists
      const saveButton = page.locator('button:has-text("Save")');
      if (await saveButton.isVisible({ timeout: 2000 })) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }
      
      // Refresh page and verify persistence
      await page.reload();
      await page.waitForSelector('[data-testid="settings"]', { timeout: 15000 });
      
      const newState = await toggleSetting.isChecked();
      expect(newState).toBe(!initialState);
    }
    
    console.log('✅ Data persistence validation completed!');
  });

  test('Critical Path: Authentication State Management', async ({ page, context }) => {
    console.log('🔐 Testing authentication state management...');
    
    const testUser = await authHelper.createTestUser();
    testUserId = testUser.email;
    
    // Verify authenticated state persists across page refreshes
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
    
    await page.reload();
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Verify authenticated state persists in new tab
    const newPage = await context.newPage();
    await newPage.goto('/dashboard');
    await newPage.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
    await expect(newPage).toHaveURL(/.*dashboard/);
    
    await newPage.close();
    
    console.log('✅ Authentication state management validated!');
  });

  test('Critical Path: Error Handling Validation', async ({ page }) => {
    console.log('🛡️ Testing error handling...');
    
    const testUser = await authHelper.createTestUser();
    testUserId = testUser.email;
    
    // Test navigation to non-existent page
    await page.goto('/nonexistent-page');
    await page.waitForTimeout(3000);
    
    // Should handle 404 gracefully
    const pageContent = await page.textContent('body');
    expect(pageContent?.toLowerCase()).toMatch(/(not found|404|page not found)/);
    
    // Test API error handling by checking for error boundaries
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
    
    // Check for any visible error messages
    const errorMessages = page.locator('[data-testid*="error"]');
    const errorCount = await errorMessages.count();
    
    // If errors exist, they should be user-friendly
    for (let i = 0; i < errorCount; i++) {
      const errorMsg = errorMessages.nth(i);
      if (await errorMsg.isVisible()) {
        const errorText = await errorMsg.textContent();
        expect(errorText?.length).toBeGreaterThan(0);
        
        // Should not expose sensitive information
        expect(errorText?.toLowerCase()).not.toContain('password');
        expect(errorText?.toLowerCase()).not.toContain('secret');
        expect(errorText?.toLowerCase()).not.toContain('token');
      }
    }
    
    console.log('✅ Error handling validation completed!');
  });

  test('Critical Path: Performance Validation', async ({ page }) => {
    console.log('⚡ Testing basic performance metrics...');
    
    const testUser = await authHelper.createTestUser();
    testUserId = testUser.email;
    
    const performanceData = {
      dashboard: 0,
      settings: 0,
      emails: 0
    };
    
    // Measure dashboard load time
    const dashboardStart = Date.now();
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
    performanceData.dashboard = Date.now() - dashboardStart;
    
    // Measure settings load time
    const settingsStart = Date.now();
    await page.goto('/settings');
    await page.waitForTimeout(3000); // Allow page to fully load
    performanceData.settings = Date.now() - settingsStart;
    
    // Measure emails load time
    const emailsStart = Date.now();
    await page.goto('/emails');
    await page.waitForTimeout(3000); // Allow page to fully load
    performanceData.emails = Date.now() - emailsStart;
    
    console.log('Performance metrics:', performanceData);
    
    // Basic performance thresholds (adjust as needed)
    expect(performanceData.dashboard).toBeLessThan(10000); // 10 seconds
    expect(performanceData.settings).toBeLessThan(8000);   // 8 seconds
    expect(performanceData.emails).toBeLessThan(8000);     // 8 seconds
    
    console.log('✅ Performance validation completed!');
  });
});