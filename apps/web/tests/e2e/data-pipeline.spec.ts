import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth-helper';
import { DatabaseHelper } from '../utils/database-helper';

test.describe('Data Pipeline Journey', () => {
  let authHelper: AuthHelper;
  let dbHelper: DatabaseHelper;
  let testUserId: string;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    dbHelper = new DatabaseHelper();
    
    // Authenticate user
    if (process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
      await authHelper.signIn(process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD);
      
      // Extract user ID
      const userInfo = await page.evaluate(() => {
        return (window as any).Clerk?.user?.id;
      });
      testUserId = userInfo || 'test-user-id';
      
      // Seed test data
      await dbHelper.seedTestData(testUserId);
    } else {
      test.skip('No test credentials provided');
    }
  });

  test.afterEach(async () => {
    // Clean up test data
    await dbHelper.cleanTestData();
  });

  test.describe('Pipeline Execution', () => {
    test('should run complete pipeline end-to-end', async ({ page }) => {
      // Navigate to dashboard
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="quick-actions"]', { timeout: 10000 });
      
      // Find and click "Run Pipeline" button
      const runPipelineButton = page.locator('button:has-text("Run Pipeline")');
      await expect(runPipelineButton).toBeVisible();
      await runPipelineButton.click();
      
      // Wait for pipeline to start
      await page.waitForSelector('[data-testid="pipeline-status"]', { timeout: 10000 });
      
      // Verify pipeline status shows "Running" or "In Progress"
      const statusElement = page.locator('[data-testid="pipeline-status"]');
      const statusText = await statusElement.textContent();
      expect(statusText?.toLowerCase()).toMatch(/(running|in progress|processing)/);
      
      // Wait for pipeline completion
      await page.waitForSelector('[data-testid="pipeline-status"]:has-text("Completed")', { 
        timeout: 60000 
      });
      
      // Verify completion status
      const finalStatus = await statusElement.textContent();
      expect(finalStatus?.toLowerCase()).toContain('completed');
    });

    test('should process emails through extraction pipeline', async ({ page }) => {
      // Navigate to emails page
      await page.goto('/emails');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 15000 });
      
      // Get initial email count
      const emailItems = page.locator('[data-testid="email-item"]');
      const initialCount = await emailItems.count();
      
      // Trigger extraction on unprocessed emails
      const extractButton = page.locator('button:has-text("Extract Companies")');
      if (await extractButton.isVisible()) {
        await extractButton.click();
        
        // Wait for extraction to start
        await page.waitForSelector('[data-testid="extraction-in-progress"]', { timeout: 10000 });
        
        // Wait for extraction to complete
        await page.waitForSelector('[data-testid="extraction-in-progress"]', { 
          state: 'hidden', 
          timeout: 60000 
        });
        
        // Verify extraction completed successfully
        const successMessage = page.locator('[data-testid="extraction-success"]');
        if (await successMessage.isVisible({ timeout: 5000 })) {
          expect(await successMessage.textContent()).toContain('extracted');
        }
      }
    });

    test('should store extracted companies in database', async ({ page }) => {
      // Run extraction first
      await page.goto('/emails');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 15000 });
      
      const extractButton = page.locator('button:has-text("Extract Companies")');
      if (await extractButton.isVisible()) {
        await extractButton.click();
        await page.waitForSelector('[data-testid="extraction-in-progress"]', { 
          state: 'hidden', 
          timeout: 60000 
        });
      }
      
      // Navigate to companies page
      await page.goto('/companies');
      await page.waitForSelector('[data-testid="company-list"]', { timeout: 15000 });
      
      // Verify companies are displayed
      const companyItems = page.locator('[data-testid="company-item"]');
      const companyCount = await companyItems.count();
      expect(companyCount).toBeGreaterThan(0);
      
      // Verify database integrity
      const stats = await dbHelper.verifyDataIntegrity(testUserId);
      expect(stats.companies).toBeGreaterThan(0);
      expect(stats.hasDummyData).toBe(false);
    });

    test('should handle pipeline status monitoring', async ({ page }) => {
      // Navigate to dashboard
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="pipeline-status-widget"]', { timeout: 10000 });
      
      // Check pipeline status widget
      const statusWidget = page.locator('[data-testid="pipeline-status-widget"]');
      await expect(statusWidget).toBeVisible();
      
      // Verify status information is displayed
      const lastRun = page.locator('[data-testid="pipeline-last-run"]');
      const nextRun = page.locator('[data-testid="pipeline-next-run"]');
      const status = page.locator('[data-testid="pipeline-current-status"]');
      
      await expect(status).toBeVisible();
      
      // If pipeline has run before, verify timestamps
      if (await lastRun.isVisible()) {
        const lastRunText = await lastRun.textContent();
        expect(lastRunText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|\w{3} \d{1,2}|\d+ (minutes?|hours?|days?) ago/);
      }
    });
  });

  test.describe('Pipeline Configuration', () => {
    test('should configure pipeline settings', async ({ page }) => {
      // Navigate to settings
      await page.goto('/settings?tab=pipeline');
      await page.waitForSelector('[data-testid="pipeline-settings"]', { timeout: 10000 });
      
      // Find auto-run toggle
      const autoRunToggle = page.locator('[data-testid="pipeline-auto-run"]');
      if (await autoRunToggle.isVisible()) {
        // Toggle auto-run setting
        await autoRunToggle.click();
        
        // Save settings
        const saveButton = page.locator('button:has-text("Save")');
        if (await saveButton.isVisible()) {
          await saveButton.click();
          
          // Verify save success
          await expect(page.locator('text=Settings saved')).toBeVisible({ timeout: 10000 });
        }
      }
    });

    test('should schedule pipeline runs', async ({ page }) => {
      await page.goto('/settings?tab=pipeline');
      await page.waitForSelector('[data-testid="pipeline-settings"]', { timeout: 10000 });
      
      // Look for scheduling options
      const scheduleSection = page.locator('[data-testid="pipeline-schedule"]');
      if (await scheduleSection.isVisible()) {
        // Test different schedule intervals
        const scheduleSelect = page.locator('select[data-testid="schedule-interval"]');
        if (await scheduleSelect.isVisible()) {
          await scheduleSelect.selectOption('daily');
          
          // Save schedule
          const saveButton = page.locator('button:has-text("Save Schedule")');
          if (await saveButton.isVisible()) {
            await saveButton.click();
            await expect(page.locator('text=Schedule updated')).toBeVisible({ timeout: 10000 });
          }
        }
      }
    });
  });

  test.describe('Data Processing Quality', () => {
    test('should ensure no dummy data in processing results', async ({ page }) => {
      // Navigate to companies page after processing
      await page.goto('/companies');
      await page.waitForSelector('[data-testid="company-list"]', { timeout: 15000 });
      
      // Check all company entries for dummy data
      const companyItems = page.locator('[data-testid="company-item"]');
      const companyCount = await companyItems.count();
      
      const dummyPatterns = [
        'example.com',
        'test.com',
        'dummy',
        'placeholder',
        'sample',
        'lorem ipsum',
        'acme corp'
      ];
      
      for (let i = 0; i < companyCount; i++) {
        const companyItem = companyItems.nth(i);
        const companyText = await companyItem.textContent();
        
        for (const pattern of dummyPatterns) {
          expect(companyText?.toLowerCase()).not.toContain(pattern.toLowerCase());
        }
      }
    });

    test('should validate company data structure', async ({ page }) => {
      await page.goto('/companies');
      await page.waitForSelector('[data-testid="company-list"]', { timeout: 15000 });
      
      const companyItems = page.locator('[data-testid="company-item"]');
      const firstCompany = companyItems.first();
      
      if (await firstCompany.isVisible()) {
        // Verify required fields are present
        await expect(firstCompany.locator('[data-testid="company-name"]')).toBeVisible();
        await expect(firstCompany.locator('[data-testid="company-domain"]')).toBeVisible();
        
        // Validate domain format
        const domain = await firstCompany.locator('[data-testid="company-domain"]').textContent();
        expect(domain).toMatch(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/);
        
        // Validate company name is not empty
        const name = await firstCompany.locator('[data-testid="company-name"]').textContent();
        expect(name?.trim().length).toBeGreaterThan(0);
      }
    });

    test('should handle processing errors gracefully', async ({ page }) => {
      // Navigate to dashboard to check for error handling
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="pipeline-status"]', { timeout: 10000 });
      
      // Check for error messages
      const errorMessage = page.locator('[data-testid="pipeline-error"]');
      const errorCount = page.locator('[data-testid="processing-errors"]');
      
      // If errors exist, they should be properly displayed
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();
        expect(errorText?.length).toBeGreaterThan(0);
        
        // Error should not contain sensitive information
        expect(errorText?.toLowerCase()).not.toContain('password');
        expect(errorText?.toLowerCase()).not.toContain('secret');
        expect(errorText?.toLowerCase()).not.toContain('api key');
      }
    });
  });

  test.describe('Pipeline Performance', () => {
    test('should complete processing within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      // Trigger pipeline
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="quick-actions"]', { timeout: 10000 });
      
      const runPipelineButton = page.locator('button:has-text("Run Pipeline")');
      await runPipelineButton.click();
      
      // Wait for completion (with reasonable timeout)
      await page.waitForSelector('[data-testid="pipeline-status"]:has-text("Completed")', { 
        timeout: 120000 // 2 minutes max
      });
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Processing should complete within 2 minutes for test data
      expect(processingTime).toBeLessThan(120000);
      
      console.log(`Pipeline completed in ${processingTime}ms`);
    });

    test('should show progress indicators during processing', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="quick-actions"]', { timeout: 10000 });
      
      const runPipelineButton = page.locator('button:has-text("Run Pipeline")');
      await runPipelineButton.click();
      
      // Verify progress indicators appear
      const progressBar = page.locator('[data-testid="pipeline-progress"]');
      const statusText = page.locator('[data-testid="pipeline-status"]');
      
      // Check for progress indicators
      const hasProgressBar = await progressBar.isVisible({ timeout: 5000 });
      const hasStatusText = await statusText.isVisible({ timeout: 5000 });
      
      expect(hasProgressBar || hasStatusText).toBe(true);
      
      // If progress bar exists, verify it shows progress
      if (hasProgressBar) {
        const progressValue = await progressBar.getAttribute('value');
        expect(progressValue).toBeDefined();
      }
    });
  });

  test.describe('Data Consistency', () => {
    test('should maintain referential integrity', async ({ page }) => {
      // Run pipeline to generate data
      await page.goto('/dashboard');
      const runPipelineButton = page.locator('button:has-text("Run Pipeline")');
      if (await runPipelineButton.isVisible()) {
        await runPipelineButton.click();
        await page.waitForSelector('[data-testid="pipeline-status"]:has-text("Completed")', { 
          timeout: 60000 
        });
      }
      
      // Verify data consistency using database helper
      const stats = await dbHelper.verifyDataIntegrity(testUserId);
      expect(stats.hasDummyData).toBe(false);
      
      // Verify email-company relationships exist
      await page.goto('/emails');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 15000 });
      
      const emailWithCompanies = page.locator('[data-testid="email-item"]:has([data-testid="extracted-companies"])');
      const hasExtractedCompanies = await emailWithCompanies.count();
      
      expect(hasExtractedCompanies).toBeGreaterThan(0);
    });

    test('should prevent duplicate processing', async ({ page }) => {
      // Run pipeline twice to test deduplication
      await page.goto('/dashboard');
      
      const runPipelineButton = page.locator('button:has-text("Run Pipeline")');
      
      // First run
      await runPipelineButton.click();
      await page.waitForSelector('[data-testid="pipeline-status"]:has-text("Completed")', { 
        timeout: 60000 
      });
      
      // Get initial counts
      await page.goto('/companies');
      await page.waitForSelector('[data-testid="company-list"]', { timeout: 15000 });
      const initialCompanyCount = await page.locator('[data-testid="company-item"]').count();
      
      // Second run
      await page.goto('/dashboard');
      await runPipelineButton.click();
      await page.waitForSelector('[data-testid="pipeline-status"]:has-text("Completed")', { 
        timeout: 60000 
      });
      
      // Verify no duplicates created
      await page.goto('/companies');
      await page.waitForSelector('[data-testid="company-list"]', { timeout: 15000 });
      const finalCompanyCount = await page.locator('[data-testid="company-item"]').count();
      
      // Count should be same or only slightly higher (new legitimate companies)
      expect(finalCompanyCount).toBeLessThanOrEqual(initialCompanyCount + 1);
    });
  });
});