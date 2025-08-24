/**
 * @file E2E test for adding a company to watchlist
 * @description Tests the complete user workflow that was experiencing hanging issues
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Settings - Add Company E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock the settings API to prevent real API calls
    await page.route('**/api/settings', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            settings: {
              account: {
                name: 'Test User',
                email: 'test@example.com',
                role: 'User',
                timezone: 'America/New_York'
              },
              companies: {
                tracking: [],
                autoDetect: true,
                minimumMentions: 3
              },
              newsletters: {
                sources: [],
                autoSubscribe: true,
                digestFrequency: 'weekly'
              },
              ai: {
                provider: 'anthropic',
                model: 'claude-3-5-sonnet-20241022',
                temperature: 0.7,
                maxTokens: 4096,
                enableEnrichment: true,
                apiKey: '',
                anthropicApiKey: '',
                openaiApiKey: ''
              },
              email: {
                provider: 'gmail',
                connected: false,
                syncFrequency: '15min',
                lastSync: null,
                autoProcess: true,
                retentionDays: 90
              },
              reports: {
                defaultFormat: 'pdf',
                includeCharts: true,
                includeSentiment: true,
                autoGenerate: {
                  daily: false,
                  weekly: false,
                  monthly: false
                },
                deliveryTime: '09:00',
                recipients: []
              },
              notifications: {
                email: {
                  enabled: true,
                  criticalOnly: false,
                  dailyDigest: true
                },
                inApp: {
                  enabled: true,
                  soundEnabled: false
                },
                thresholds: {
                  negativeSentiment: -0.5,
                  mentionVolume: 10,
                  competitorMentions: true
                }
              },
              api: {
                keys: [],
                webhooks: []
              },
              privacy: {
                dataRetention: 365,
                shareAnalytics: true,
                allowExport: true
              },
              appearance: {
                theme: 'system',
                accentColor: 'blue',
                fontSize: 'medium',
                compactMode: false,
                showTips: true
              }
            }
          })
        });
      } else if (request.method() === 'PUT') {
        // Mock successful save
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Settings saved successfully'
          })
        });
      }
    });

    // Mock authentication
    await page.route('**/api/auth/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true })
      });
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should navigate to settings and add a company without hanging', async () => {
    // Navigate to settings page
    await page.goto('/settings');

    // Wait for the page to load completely (no hanging)
    await expect(page.locator('h1')).toContainText('Settings', { timeout: 10000 });

    // Verify loading spinner disappears and doesn't hang
    await expect(page.locator('text=Loading settings...')).not.toBeVisible({ timeout: 5000 });

    // Navigate to the Companies tab
    await page.locator('text=Companies').first().click();

    // Verify we're on the companies section
    await expect(page.locator('text=Company Watchlist')).toBeVisible();
    await expect(page.locator('text=Track specific companies')).toBeVisible();

    // Find and click the Add Company button
    const addCompanyButton = page.locator('button:has-text("Add Company")');
    await expect(addCompanyButton).toBeVisible();
    
    // Click the Add Company button
    await addCompanyButton.click();

    // Verify the company was added without hanging
    await expect(page.locator('text=New Company')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=example.com')).toBeVisible();
    await expect(page.locator('text=keyword')).toBeVisible();

    // Verify the page is still responsive and not hung
    await expect(page.locator('h1')).toContainText('Settings');
    await expect(page.locator('text=Company Watchlist')).toBeVisible();
  });

  test('should handle multiple company additions', async () => {
    await page.goto('/settings');

    // Wait for loading to complete
    await expect(page.locator('text=Loading settings...')).not.toBeVisible({ timeout: 5000 });

    // Navigate to Companies tab
    await page.locator('text=Companies').first().click();

    const addCompanyButton = page.locator('button:has-text("Add Company")');

    // Add first company
    await addCompanyButton.click();
    await expect(page.locator('text=New Company').first()).toBeVisible();

    // Add second company
    await addCompanyButton.click();
    await expect(page.locator('text=New Company').nth(1)).toBeVisible();

    // Verify both companies are present
    const companyElements = page.locator('text=New Company');
    await expect(companyElements).toHaveCount(2);

    // Verify page remains responsive
    await expect(page.locator('h1')).toContainText('Settings');
  });

  test('should handle rapid clicking without hanging', async () => {
    await page.goto('/settings');

    await expect(page.locator('text=Loading settings...')).not.toBeVisible({ timeout: 5000 });

    await page.locator('text=Companies').first().click();

    const addCompanyButton = page.locator('button:has-text("Add Company")');

    // Rapidly click the button multiple times
    for (let i = 0; i < 5; i++) {
      await addCompanyButton.click({ delay: 100 });
    }

    // Wait for all companies to appear
    await expect(page.locator('text=New Company')).toHaveCount(5, { timeout: 5000 });

    // Verify page is still responsive
    await expect(page.locator('h1')).toContainText('Settings');
    
    // Verify we can still interact with other elements
    await page.locator('text=Account').first().click();
    await expect(page.locator('text=Account Settings')).toBeVisible();
  });

  test('should toggle company enabled state', async () => {
    await page.goto('/settings');

    await expect(page.locator('text=Loading settings...')).not.toBeVisible({ timeout: 5000 });

    await page.locator('text=Companies').first().click();

    // Add a company
    await page.locator('button:has-text("Add Company")').click();
    await expect(page.locator('text=New Company')).toBeVisible();

    // Find and toggle the company's enabled switch
    const enabledSwitch = page.locator('input[type="checkbox"]').first();
    
    // Switch should be enabled by default
    await expect(enabledSwitch).toBeChecked();
    
    // Toggle it off
    await enabledSwitch.click();
    await expect(enabledSwitch).not.toBeChecked();
    
    // Toggle it back on
    await enabledSwitch.click();
    await expect(enabledSwitch).toBeChecked();

    // Verify page remains responsive
    await expect(page.locator('h1')).toContainText('Settings');
  });

  test('should remove company from tracking', async () => {
    await page.goto('/settings');

    await expect(page.locator('text=Loading settings...')).not.toBeVisible({ timeout: 5000 });

    await page.locator('text=Companies').first().click();

    // Add a company
    await page.locator('button:has-text("Add Company")').click();
    await expect(page.locator('text=New Company')).toBeVisible();

    // Mock the confirm dialog to always return true
    await page.evaluate(() => {
      window.confirm = () => true;
    });

    // Find and click the remove button (trash icon)
    const removeButton = page.locator('button[title="Remove company from tracking"]');
    await removeButton.click();

    // Verify the company was removed
    await expect(page.locator('text=New Company')).not.toBeVisible({ timeout: 3000 });

    // Verify page remains responsive
    await expect(page.locator('h1')).toContainText('Settings');
    await expect(page.locator('text=Company Watchlist')).toBeVisible();
  });

  test('should save settings with new company', async () => {
    await page.goto('/settings');

    await expect(page.locator('text=Loading settings...')).not.toBeVisible({ timeout: 5000 });

    await page.locator('text=Companies').first().click();

    // Add a company
    await page.locator('button:has-text("Add Company")').click();
    await expect(page.locator('text=New Company')).toBeVisible();

    // Find and click the save button (if available)
    const saveButton = page.locator('button:has-text("Save")').first();
    if (await saveButton.isVisible()) {
      await saveButton.click();
      
      // Should show success toast or indication
      // Note: Toast messages might need additional selectors based on implementation
      await page.waitForTimeout(1000); // Wait for save operation
    }

    // Verify page remains responsive after save
    await expect(page.locator('h1')).toContainText('Settings');
    await expect(page.locator('text=New Company')).toBeVisible();
  });

  test('should handle slow network without hanging', async () => {
    // Simulate slow network by adding delay to API responses
    await page.route('**/api/settings', async (route, request) => {
      if (request.method() === 'GET') {
        // Add 2 second delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            settings: {
              account: { name: 'Test User', email: 'test@example.com', role: 'User', timezone: 'UTC' },
              companies: { tracking: [], autoDetect: true, minimumMentions: 3 },
              newsletters: { sources: [], autoSubscribe: true, digestFrequency: 'weekly' },
              ai: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.7, maxTokens: 4096, enableEnrichment: true, apiKey: '', anthropicApiKey: '', openaiApiKey: '' },
              email: { provider: 'gmail', connected: false, syncFrequency: '15min', lastSync: null, autoProcess: true, retentionDays: 90 },
              reports: { defaultFormat: 'pdf', includeCharts: true, includeSentiment: true, autoGenerate: { daily: false, weekly: false, monthly: false }, deliveryTime: '09:00', recipients: [] },
              notifications: { email: { enabled: true, criticalOnly: false, dailyDigest: true }, inApp: { enabled: true, soundEnabled: false }, thresholds: { negativeSentiment: -0.5, mentionVolume: 10, competitorMentions: true } },
              api: { keys: [], webhooks: [] },
              privacy: { dataRetention: 365, shareAnalytics: true, allowExport: true },
              appearance: { theme: 'system', accentColor: 'blue', fontSize: 'medium', compactMode: false, showTips: true }
            }
          })
        });
      }
    });

    await page.goto('/settings');

    // Should show loading state
    await expect(page.locator('text=Loading settings...')).toBeVisible();

    // Should eventually load without hanging
    await expect(page.locator('text=Loading settings...')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Settings');

    // Should be able to add company after loading
    await page.locator('text=Companies').first().click();
    await page.locator('button:has-text("Add Company")').click();
    await expect(page.locator('text=New Company')).toBeVisible();
  });

  test('should handle API errors gracefully without hanging', async () => {
    // Mock API to return error
    await page.route('**/api/settings', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal Server Error'
          })
        });
      }
    });

    await page.goto('/settings');

    // Should show error state, not hang
    await expect(page.locator('text=⚠️ Failed to load settings')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Server error. Please try again later.')).toBeVisible();

    // Should show retry button
    const retryButton = page.locator('button:has-text("Retry")');
    await expect(retryButton).toBeVisible();

    // Add Company button should not be available in error state
    await expect(page.locator('button:has-text("Add Company")')).not.toBeVisible();
  });
});