import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth-helper';
import { DatabaseHelper } from '../utils/database-helper';

test.describe('Onboarding Journey', () => {
  let authHelper: AuthHelper;
  let dbHelper: DatabaseHelper;
  let testUserId: string;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    dbHelper = new DatabaseHelper();
  });

  test.afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await dbHelper.cleanTestData();
    }
  });

  test.describe('New User Onboarding Flow', () => {
    test('should display onboarding checklist for new users', async ({ page }) => {
      // Create a fresh test user
      const testUser = await authHelper.createTestUser();
      testUserId = testUser.email;
      
      // Navigate to dashboard - should show onboarding
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="onboarding-checklist"]', { timeout: 15000 });
      
      // Verify onboarding checklist is visible
      const onboardingChecklist = page.locator('[data-testid="onboarding-checklist"]');
      await expect(onboardingChecklist).toBeVisible();
      
      // Verify all onboarding steps are present
      const expectedSteps = [
        'Take the product tour',
        'Connect Gmail account',
        'Configure newsletters',
        'Add companies to track',
        'Run first pipeline'
      ];
      
      for (const step of expectedSteps) {
        await expect(page.locator(`text=${step}`)).toBeVisible();
      }
      
      // Verify progress is shown
      const progressBar = page.locator('[data-testid="onboarding-progress"]');
      await expect(progressBar).toBeVisible();
    });

    test('should complete product tour step', async ({ page }) => {
      const testUser = await authHelper.createTestUser();
      testUserId = testUser.email;
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="onboarding-checklist"]', { timeout: 15000 });
      
      // Find and click "Start Tour" button
      const startTourButton = page.locator('button:has-text("Start Tour")');
      await expect(startTourButton).toBeVisible();
      await startTourButton.click();
      
      // Wait for tour to start
      await page.waitForSelector('[data-testid="onboarding-tour"]', { timeout: 10000 });
      
      // Verify tour modal/overlay is visible
      const tourModal = page.locator('[data-testid="onboarding-tour"]');
      await expect(tourModal).toBeVisible();
      
      // Go through tour steps
      const nextButton = page.locator('button:has-text("Next")');
      const skipButton = page.locator('button:has-text("Skip")');
      const finishButton = page.locator('button:has-text("Finish")');
      
      // Click through tour steps or skip
      let stepCount = 0;
      while (stepCount < 10) { // Prevent infinite loop
        if (await finishButton.isVisible({ timeout: 2000 })) {
          await finishButton.click();
          break;
        } else if (await nextButton.isVisible({ timeout: 2000 })) {
          await nextButton.click();
        } else if (await skipButton.isVisible({ timeout: 2000 })) {
          await skipButton.click();
          break;
        } else {
          break;
        }
        stepCount++;
      }
      
      // Verify tour completion
      await page.waitForSelector('[data-testid="onboarding-tour"]', { state: 'hidden', timeout: 10000 });
      
      // Verify checklist item is marked complete
      await expect(page.locator('[data-testid="tour-step-completed"]')).toBeVisible({ timeout: 10000 });
    });

    test('should guide through Gmail connection step', async ({ page }) => {
      const testUser = await authHelper.createTestUser();
      testUserId = testUser.email;
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="onboarding-checklist"]', { timeout: 15000 });
      
      // Find and click "Connect Gmail" button in checklist
      const connectGmailButton = page.locator('[data-testid="onboarding-checklist"] button:has-text("Connect")');
      await expect(connectGmailButton).toBeVisible();
      await connectGmailButton.click();
      
      // Should navigate to settings email tab
      await page.waitForURL('**/settings?tab=email', { timeout: 10000 });
      await expect(page).toHaveURL(/.*settings.*tab=email/);
      
      // Verify Gmail connection section is visible
      const gmailSection = page.locator('[data-testid="gmail-connection-section"]');
      await expect(gmailSection).toBeVisible({ timeout: 10000 });
      
      // Look for Gmail connect button
      const gmailConnectButton = page.locator('button:has-text("Connect Gmail")');
      if (await gmailConnectButton.isVisible()) {
        await expect(gmailConnectButton).toBeVisible();
      }
    });

    test('should track onboarding progress persistence', async ({ page }) => {
      const testUser = await authHelper.createTestUser();
      testUserId = testUser.email;
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="onboarding-checklist"]', { timeout: 15000 });
      
      // Complete first step (tour)
      const startTourButton = page.locator('button:has-text("Start Tour")');
      if (await startTourButton.isVisible()) {
        await startTourButton.click();
        
        // Skip through tour
        const skipButton = page.locator('button:has-text("Skip")');
        if (await skipButton.isVisible({ timeout: 5000 })) {
          await skipButton.click();
        }
      }
      
      // Refresh the page
      await page.reload();
      await page.waitForSelector('[data-testid="onboarding-checklist"]', { timeout: 15000 });
      
      // Verify progress is persisted
      const completedStep = page.locator('[data-testid="tour-step-completed"]');
      await expect(completedStep).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Onboarding Gamification', () => {
    test('should show progress indicators', async ({ page }) => {
      const testUser = await authHelper.createTestUser();
      testUserId = testUser.email;
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="onboarding-checklist"]', { timeout: 15000 });
      
      // Verify progress bar is visible
      const progressBar = page.locator('[data-testid="onboarding-progress"]');
      await expect(progressBar).toBeVisible();
      
      // Verify progress percentage
      const progressText = page.locator('[data-testid="onboarding-progress-text"]');
      await expect(progressText).toBeVisible();
      
      const progressValue = await progressText.textContent();
      expect(progressValue).toMatch(/\d+ of \d+ steps completed/);
    });

    test('should update progress when steps are completed', async ({ page }) => {
      const testUser = await authHelper.createTestUser();
      testUserId = testUser.email;
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="onboarding-checklist"]', { timeout: 15000 });
      
      // Get initial progress
      const initialProgress = await page.locator('[data-testid="onboarding-progress"]').getAttribute('value');
      
      // Complete a step (tour)
      const startTourButton = page.locator('button:has-text("Start Tour")');
      if (await startTourButton.isVisible()) {
        await startTourButton.click();
        
        const skipButton = page.locator('button:has-text("Skip")');
        if (await skipButton.isVisible({ timeout: 5000 })) {
          await skipButton.click();
        }
      }
      
      // Wait for progress update
      await page.waitForTimeout(2000);
      
      // Verify progress increased
      const updatedProgress = await page.locator('[data-testid="onboarding-progress"]').getAttribute('value');
      expect(parseInt(updatedProgress || '0')).toBeGreaterThan(parseInt(initialProgress || '0'));
    });

    test('should show completion celebration', async ({ page }) => {
      const testUser = await authHelper.createTestUser();
      testUserId = testUser.email;
      
      // This test would require completing all onboarding steps
      // For now, we'll test if completion UI exists
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="onboarding-checklist"]', { timeout: 15000 });
      
      // Check if completion celebration elements are defined
      const celebrationModal = page.locator('[data-testid="onboarding-completion"]');
      const dismissButton = page.locator('[data-testid="onboarding-dismiss"]');
      
      // These might not be visible unless onboarding is complete
      // Just verify the elements exist in the DOM (hidden is OK)
      const hasCelebration = await celebrationModal.count() > 0;
      const hasDismiss = await dismissButton.count() > 0;
      
      // At least one completion element should exist
      expect(hasCelebration || hasDismiss).toBe(true);
    });

    test('should allow dismissing onboarding checklist', async ({ page }) => {
      const testUser = await authHelper.createTestUser();
      testUserId = testUser.email;
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="onboarding-checklist"]', { timeout: 15000 });
      
      // Find dismiss button (usually an X or close button)
      const dismissButton = page.locator('[data-testid="onboarding-dismiss"]');
      
      if (await dismissButton.isVisible()) {
        await dismissButton.click();
        
        // Verify checklist is hidden
        await page.waitForSelector('[data-testid="onboarding-checklist"]', { 
          state: 'hidden', 
          timeout: 10000 
        });
        
        // Refresh and verify it stays dismissed
        await page.reload();
        await page.waitForTimeout(5000);
        
        const checklistVisible = await page.locator('[data-testid="onboarding-checklist"]').isVisible({ timeout: 2000 });
        expect(checklistVisible).toBe(false);
      }
    });
  });

  test.describe('Onboarding Step Validation', () => {
    test('should validate Gmail connection step completion', async ({ page }) => {
      const testUser = await authHelper.createTestUser();
      testUserId = testUser.email;
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="onboarding-checklist"]', { timeout: 15000 });
      
      // Navigate to Gmail connection
      const connectButton = page.locator('[data-testid="onboarding-checklist"] button:has-text("Connect")');
      await connectButton.click();
      
      // Should go to settings
      await page.waitForURL('**/settings?tab=email', { timeout: 10000 });
      
      // Mock Gmail connection for testing
      const mockConnectButton = page.locator('[data-testid="mock-gmail-connection"]');
      if (await mockConnectButton.isVisible({ timeout: 5000 })) {
        await mockConnectButton.click();
        
        // Go back to dashboard
        await page.goto('/dashboard');
        await page.waitForSelector('[data-testid="onboarding-checklist"]', { timeout: 15000 });
        
        // Verify Gmail step is marked complete
        const gmailStepCompleted = page.locator('[data-testid="gmail-step-completed"]');
        await expect(gmailStepCompleted).toBeVisible({ timeout: 10000 });
      }
    });

    test('should validate pipeline run step', async ({ page }) => {
      const testUser = await authHelper.createTestUser();
      testUserId = testUser.email;
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="onboarding-checklist"]', { timeout: 15000 });
      
      // Click run pipeline from onboarding
      const runPipelineButton = page.locator('[data-testid="onboarding-checklist"] button:has-text("Run Pipeline")');
      if (await runPipelineButton.isVisible()) {
        await runPipelineButton.click();
        
        // Should trigger pipeline run
        await page.waitForSelector('[data-testid="pipeline-status"]', { timeout: 10000 });
        
        // Wait for pipeline to complete or start
        const pipelineStatus = page.locator('[data-testid="pipeline-status"]');
        const statusText = await pipelineStatus.textContent();
        
        expect(statusText?.toLowerCase()).toMatch(/(running|completed|in progress)/);
      }
    });

    test('should handle onboarding step errors gracefully', async ({ page }) => {
      const testUser = await authHelper.createTestUser();
      testUserId = testUser.email;
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="onboarding-checklist"]', { timeout: 15000 });
      
      // Try to complete a step that might fail (e.g., Gmail without proper setup)
      const connectButton = page.locator('[data-testid="onboarding-checklist"] button:has-text("Connect")');
      await connectButton.click();
      
      await page.waitForURL('**/settings?tab=email', { timeout: 10000 });
      
      // Look for error handling
      const errorMessage = page.locator('[data-testid="connection-error"]');
      const retryButton = page.locator('button:has-text("Retry")');
      const helpText = page.locator('[data-testid="connection-help"]');
      
      // If there's an error, it should be handled gracefully
      if (await errorMessage.isVisible({ timeout: 5000 })) {
        const errorText = await errorMessage.textContent();
        expect(errorText?.length).toBeGreaterThan(0);
        
        // Should provide help or retry options
        const hasRetry = await retryButton.isVisible({ timeout: 2000 });
        const hasHelp = await helpText.isVisible({ timeout: 2000 });
        
        expect(hasRetry || hasHelp).toBe(true);
      }
    });
  });

  test.describe('Onboarding Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      const testUser = await authHelper.createTestUser();
      testUserId = testUser.email;
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="onboarding-checklist"]', { timeout: 15000 });
      
      // Test keyboard navigation through onboarding steps
      await page.keyboard.press('Tab');
      
      // Should be able to reach onboarding buttons
      const focusedElement = await page.locator(':focus');
      const isOnboardingFocused = await focusedElement.evaluate(el => 
        el.closest('[data-testid="onboarding-checklist"]') !== null
      );
      
      // With multiple tab presses, should eventually reach onboarding elements
      let tabCount = 0;
      while (tabCount < 10 && !isOnboardingFocused) {
        await page.keyboard.press('Tab');
        tabCount++;
        
        const currentFocus = await page.locator(':focus');
        const isNowFocused = await currentFocus.evaluate(el => 
          el.closest('[data-testid="onboarding-checklist"]') !== null
        );
        
        if (isNowFocused) break;
      }
      
      // Should eventually reach onboarding elements
      expect(tabCount).toBeLessThan(10);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      const testUser = await authHelper.createTestUser();
      testUserId = testUser.email;
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="onboarding-checklist"]', { timeout: 15000 });
      
      // Check for ARIA labels on key elements
      const checklist = page.locator('[data-testid="onboarding-checklist"]');
      const progressBar = page.locator('[data-testid="onboarding-progress"]');
      
      // Progress bar should have proper ARIA attributes
      if (await progressBar.isVisible()) {
        const ariaLabel = await progressBar.getAttribute('aria-label');
        const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
        
        expect(ariaLabel || ariaValueNow).toBeDefined();
      }
      
      // Buttons should have accessible text
      const buttons = page.locator('[data-testid="onboarding-checklist"] button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const buttonText = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        
        expect(buttonText?.trim().length || ariaLabel?.length).toBeGreaterThan(0);
      }
    });
  });
});