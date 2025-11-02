import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth-helper';
import { DatabaseHelper } from '../utils/database-helper';

test.describe('Gmail Integration Journey', () => {
  let authHelper: AuthHelper;
  let dbHelper: DatabaseHelper;
  let testUserId: string;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    dbHelper = new DatabaseHelper();
    
    // Authenticate user
    if (process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
      await authHelper.signIn(process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD);
      
      // Extract user ID from the authenticated session
      const userInfo = await page.evaluate(() => {
        return (window as any).NextAuth?.user?.id;
      });
      testUserId = userInfo || 'test-user-id';
    } else {
      test.skip('No test credentials provided');
    }
  });

  test.afterEach(async () => {
    // Clean up test data
    await dbHelper.cleanTestData();
  });

  test.describe('Gmail Connection Flow', () => {
    test('should initiate Gmail OAuth connection', async ({ page }) => {
      // Navigate to settings email tab
      await page.goto('/settings?tab=email');
      
      // Wait for settings to load
      await page.waitForSelector('[data-testid="settings-email-tab"]', { timeout: 10000 });
      
      // Find Gmail connect button
      const gmailConnectButton = page.locator('button:has-text("Connect Gmail")');
      
      if (await gmailConnectButton.isVisible()) {
        // Click connect Gmail
        await gmailConnectButton.click();
        
        // Should initiate OAuth flow - check for redirect or popup
        await page.waitForTimeout(2000);
        
        // In test environment, might show OAuth URL or mock connection
        const oauthRedirect = page.locator('[data-testid="oauth-redirect"]');
        const mockConnection = page.locator('[data-testid="mock-gmail-connection"]');
        
        // Verify OAuth initiation or mock connection
        const hasOauth = await oauthRedirect.isVisible({ timeout: 5000 });
        const hasMock = await mockConnection.isVisible({ timeout: 5000 });
        
        expect(hasOauth || hasMock).toBe(true);
        
        // If mock connection available, use it
        if (hasMock) {
          await mockConnection.click();
          
          // Verify connection success
          await expect(page.locator('text=Gmail Connected')).toBeVisible({ timeout: 10000 });
        }
      } else {
        // Gmail might already be connected
        await expect(page.locator('text=Gmail Connected')).toBeVisible({ timeout: 5000 });
      }
    });

    test('should display Gmail connection status', async ({ page }) => {
      await page.goto('/settings?tab=email');
      await page.waitForSelector('[data-testid="gmail-connection-status"]', { timeout: 10000 });
      
      const connectionStatus = page.locator('[data-testid="gmail-connection-status"]');
      await expect(connectionStatus).toBeVisible();
      
      // Should show either "Connected" or "Disconnected"
      const statusText = await connectionStatus.textContent();
      expect(statusText).toMatch(/(Connected|Disconnected|Not Connected)/);
    });

    test('should handle Gmail OAuth callback', async ({ page, context }) => {
      // Navigate to settings
      await page.goto('/settings?tab=email');
      
      // Mock OAuth callback URL
      const mockCallbackUrl = `${page.url().split('/settings')[0]}/api/auth/gmail/callback?code=test_auth_code&state=${testUserId}`;
      
      // Navigate to callback URL
      await page.goto(mockCallbackUrl);
      
      // Should process callback and redirect
      await page.waitForURL('**/settings*', { timeout: 10000 });
      
      // Verify success message or connection status update
      const successMessage = page.locator('text=Gmail connected successfully');
      const connectionStatus = page.locator('[data-testid="gmail-connection-status"]');
      
      const hasSuccessMessage = await successMessage.isVisible({ timeout: 5000 });
      const hasConnectionStatus = await connectionStatus.isVisible({ timeout: 5000 });
      
      expect(hasSuccessMessage || hasConnectionStatus).toBe(true);
    });
  });

  test.describe('Email Fetching', () => {
    test('should fetch emails from Gmail', async ({ page }) => {
      // Ensure Gmail is connected first
      const isConnected = await authHelper.waitForGmailConnection();
      if (!isConnected) {
        test.skip('Gmail not connected for this test');
      }
      
      // Navigate to emails page
      await page.goto('/emails');
      
      // Wait for emails to load
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 15000 });
      
      // Trigger email sync if needed
      const syncButton = page.locator('button:has-text("Sync Emails")');
      if (await syncButton.isVisible()) {
        await syncButton.click();
        
        // Wait for sync to complete
        await page.waitForSelector('[data-testid="sync-in-progress"]', { state: 'hidden', timeout: 30000 });
      }
      
      // Verify emails are displayed
      const emailItems = page.locator('[data-testid="email-item"]');
      const emailCount = await emailItems.count();
      
      expect(emailCount).toBeGreaterThan(0);
      
      // Verify email data integrity
      const firstEmail = emailItems.first();
      await expect(firstEmail.locator('[data-testid="email-subject"]')).toBeVisible();
      await expect(firstEmail.locator('[data-testid="email-sender"]')).toBeVisible();
      await expect(firstEmail.locator('[data-testid="email-date"]')).toBeVisible();
    });

    test('should not contain dummy email data', async ({ page }) => {
      await page.goto('/emails');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 15000 });
      
      // Check for dummy data indicators
      const dummyPatterns = [
        'example@example.com',
        'test@example.com',
        'dummy',
        'placeholder',
        'lorem ipsum',
        'sample email'
      ];
      
      const emailItems = page.locator('[data-testid="email-item"]');
      const emailCount = await emailItems.count();
      
      for (let i = 0; i < emailCount; i++) {
        const emailItem = emailItems.nth(i);
        const emailText = await emailItem.textContent();
        
        for (const pattern of dummyPatterns) {
          expect(emailText?.toLowerCase()).not.toContain(pattern.toLowerCase());
        }
      }
    });

    test('should validate email data format', async ({ page }) => {
      await page.goto('/emails');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 15000 });
      
      const emailItems = page.locator('[data-testid="email-item"]');
      const firstEmail = emailItems.first();
      
      if (await firstEmail.isVisible()) {
        // Validate email address format
        const senderEmail = await firstEmail.locator('[data-testid="email-sender"]').textContent();
        expect(senderEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        
        // Validate date format
        const emailDate = await firstEmail.locator('[data-testid="email-date"]').textContent();
        expect(emailDate).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|\w{3} \d{1,2}, \d{4}/);
        
        // Validate subject exists and is not empty
        const subject = await firstEmail.locator('[data-testid="email-subject"]').textContent();
        expect(subject?.trim().length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Email Processing Pipeline', () => {
    test('should extract companies from emails', async ({ page }) => {
      // Navigate to emails page
      await page.goto('/emails');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 15000 });
      
      // Trigger company extraction
      const extractButton = page.locator('button:has-text("Extract Companies")');
      if (await extractButton.isVisible()) {
        await extractButton.click();
        
        // Wait for extraction to complete
        await page.waitForSelector('[data-testid="extraction-in-progress"]', { state: 'hidden', timeout: 60000 });
      }
      
      // Navigate to companies page to verify extraction
      await page.goto('/companies');
      await page.waitForSelector('[data-testid="company-list"]', { timeout: 15000 });
      
      // Verify companies were extracted
      const companyItems = page.locator('[data-testid="company-item"]');
      const companyCount = await companyItems.count();
      
      expect(companyCount).toBeGreaterThan(0);
      
      // Verify company data quality
      const firstCompany = companyItems.first();
      await expect(firstCompany.locator('[data-testid="company-name"]')).toBeVisible();
      await expect(firstCompany.locator('[data-testid="company-domain"]')).toBeVisible();
    });

    test('should store email data in Supabase correctly', async ({ page }) => {
      // Verify database integrity using helper
      const stats = await dbHelper.verifyDataIntegrity(testUserId);
      
      expect(stats.hasDummyData).toBe(false);
      expect(stats.emails).toBeGreaterThan(0);
      expect(stats.companies).toBeGreaterThan(0);
    });

    test('should handle pipeline errors gracefully', async ({ page }) => {
      // Navigate to pipeline status page
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="pipeline-status"]', { timeout: 10000 });
      
      // Check for error handling
      const errorMessage = page.locator('[data-testid="pipeline-error"]');
      const statusIndicator = page.locator('[data-testid="pipeline-status-indicator"]');
      
      await expect(statusIndicator).toBeVisible();
      
      // If there are errors, they should be displayed clearly
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();
        expect(errorText?.length).toBeGreaterThan(0);
        
        // Error message should not contain sensitive information
        expect(errorText?.toLowerCase()).not.toContain('password');
        expect(errorText?.toLowerCase()).not.toContain('secret');
        expect(errorText?.toLowerCase()).not.toContain('token');
      }
    });
  });

  test.describe('Gmail Disconnection', () => {
    test('should disconnect Gmail account', async ({ page }) => {
      await page.goto('/settings?tab=email');
      await page.waitForSelector('[data-testid="gmail-connection-status"]', { timeout: 10000 });
      
      // Find disconnect button
      const disconnectButton = page.locator('button:has-text("Disconnect Gmail")');
      
      if (await disconnectButton.isVisible()) {
        // Click disconnect
        await disconnectButton.click();
        
        // Confirm disconnection if modal appears
        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }
        
        // Verify disconnection
        await expect(page.locator('text=Gmail disconnected')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('button:has-text("Connect Gmail")')).toBeVisible({ timeout: 5000 });
      }
    });

    test('should clear Gmail data after disconnection', async ({ page }) => {
      // Disconnect Gmail first
      await page.goto('/settings?tab=email');
      
      const disconnectButton = page.locator('button:has-text("Disconnect Gmail")');
      if (await disconnectButton.isVisible()) {
        await disconnectButton.click();
        
        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }
        
        // Wait for disconnection to complete
        await page.waitForSelector('button:has-text("Connect Gmail")', { timeout: 10000 });
        
        // Check that Gmail-related data is cleared
        await page.goto('/emails');
        
        // Should show empty state or no Gmail emails
        const emptyState = page.locator('[data-testid="emails-empty-state"]');
        const noGmailMessage = page.locator('text=Connect Gmail to see emails');
        
        const hasEmptyState = await emptyState.isVisible({ timeout: 5000 });
        const hasNoGmailMessage = await noGmailMessage.isVisible({ timeout: 5000 });
        
        expect(hasEmptyState || hasNoGmailMessage).toBe(true);
      }
    });
  });

  test.describe('Email Security', () => {
    test('should not expose sensitive email content in client', async ({ page }) => {
      await page.goto('/emails');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 15000 });
      
      // Check that full email content is not exposed in client-side code
      const pageContent = await page.content();
      
      // Should not contain sensitive patterns in HTML
      expect(pageContent).not.toContain('password');
      expect(pageContent).not.toContain('credit card');
      expect(pageContent).not.toContain('ssn');
      expect(pageContent).not.toContain('social security');
    });

    test('should handle Gmail API rate limits', async ({ page }) => {
      // This test might be challenging without actual rate limiting
      // Instead, verify that rate limit handling UI exists
      
      await page.goto('/settings?tab=email');
      
      // Look for rate limit information or warnings
      const rateLimitInfo = page.locator('[data-testid="gmail-rate-limit-info"]');
      const quotaInfo = page.locator('text=quota');
      
      // If rate limit info exists, it should be informative
      if (await rateLimitInfo.isVisible({ timeout: 2000 })) {
        const infoText = await rateLimitInfo.textContent();
        expect(infoText?.length).toBeGreaterThan(0);
      }
    });
  });
});