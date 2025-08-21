import { Page, expect, Locator } from '@playwright/test';

export interface ButtonTestResult {
  buttonText: string;
  selector: string;
  success: boolean;
  error?: string;
  screenshot?: string;
  responseStatus?: number;
  responseData?: any;
}

export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Click a button and verify the result
   */
  async clickAndVerify(
    selector: string,
    options: {
      waitForResponse?: string;
      waitForNavigation?: boolean;
      expectToast?: boolean;
      expectModal?: boolean;
      expectError?: boolean;
      timeout?: number;
      screenshot?: boolean;
    } = {}
  ): Promise<ButtonTestResult> {
    const result: ButtonTestResult = {
      buttonText: '',
      selector,
      success: false,
    };

    try {
      // Get button text before clicking
      const button = await this.page.locator(selector).first();
      result.buttonText = await button.textContent() || '';
      
      // Take screenshot before clicking if requested
      if (options.screenshot) {
        const screenshotName = `before-${selector.replace(/[^a-z0-9]/gi, '-')}.png`;
        await this.page.screenshot({ 
          path: `test-results/screenshots/${screenshotName}`,
          fullPage: true 
        });
      }

      // Setup response listener if needed
      let responsePromise;
      if (options.waitForResponse) {
        responsePromise = this.page.waitForResponse(
          response => response.url().includes(options.waitForResponse!),
          { timeout: options.timeout || 10000 }
        );
      }

      // Setup navigation listener if needed
      let navigationPromise;
      if (options.waitForNavigation) {
        navigationPromise = this.page.waitForURL('**/*', { 
          timeout: options.timeout || 10000 
        });
      }

      // Click the button
      await button.click();

      // Wait for response if expected
      if (responsePromise) {
        const response = await responsePromise;
        result.responseStatus = response.status();
        if (response.ok()) {
          result.responseData = await response.json().catch(() => null);
        }
      }

      // Wait for navigation if expected
      if (navigationPromise) {
        await navigationPromise;
      }

      // Check for toast notification
      if (options.expectToast) {
        const toast = await this.page.locator('[role="alert"], .toast, [class*="toast"]').first();
        await expect(toast).toBeVisible({ timeout: 5000 });
        const toastText = await toast.textContent();
        console.log(`✅ Toast appeared: ${toastText}`);
      }

      // Check for modal
      if (options.expectModal) {
        const modal = await this.page.locator('[role="dialog"], .modal, [class*="modal"]').first();
        await expect(modal).toBeVisible({ timeout: 5000 });
        console.log(`✅ Modal appeared`);
      }

      // Check for error
      if (options.expectError) {
        const error = await this.page.locator('.error, [class*="error"], [class*="destructive"]').first();
        const isVisible = await error.isVisible().catch(() => false);
        if (!isVisible && !options.expectError) {
          throw new Error('Expected error did not appear');
        }
      }

      // Take screenshot after clicking if requested
      if (options.screenshot) {
        const screenshotName = `after-${selector.replace(/[^a-z0-9]/gi, '-')}.png`;
        result.screenshot = screenshotName;
        await this.page.screenshot({ 
          path: `test-results/screenshots/${screenshotName}`,
          fullPage: true 
        });
      }

      result.success = true;
      console.log(`✅ Successfully clicked: ${result.buttonText}`);
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      console.log(`❌ Failed to click ${selector}: ${result.error}`);
      
      // Take error screenshot
      const errorScreenshot = `error-${selector.replace(/[^a-z0-9]/gi, '-')}.png`;
      await this.page.screenshot({ 
        path: `test-results/screenshots/${errorScreenshot}`,
        fullPage: true 
      });
      result.screenshot = errorScreenshot;
    }

    return result;
  }

  /**
   * Test all buttons on the current page
   */
  async testAllButtons(): Promise<ButtonTestResult[]> {
    const results: ButtonTestResult[] = [];
    
    // Find all buttons
    const buttons = await this.page.locator('button, [role="button"], a[href]').all();
    console.log(`Found ${buttons.length} clickable elements`);

    for (const button of buttons) {
      const isVisible = await button.isVisible().catch(() => false);
      if (!isVisible) continue;

      const text = await button.textContent() || '';
      const tagName = await button.evaluate(el => el.tagName.toLowerCase());
      const href = tagName === 'a' ? await button.getAttribute('href') : null;
      
      console.log(`Testing ${tagName}: "${text.trim()}"${href ? ` (${href})` : ''}`);

      // Determine what to expect based on button text/attributes
      const options: any = {};
      
      if (text.includes('Sign') || text.includes('Log')) {
        options.expectModal = true;
      } else if (text.includes('Trigger') || text.includes('Test') || text.includes('Refresh')) {
        options.waitForResponse = '/api/';
        options.expectToast = true;
      } else if (href && !href.startsWith('#')) {
        options.waitForNavigation = true;
      }

      const selector = `text="${text.trim()}"`;
      const result = await this.clickAndVerify(selector, options);
      results.push(result);

      // Go back if we navigated away
      if (options.waitForNavigation) {
        await this.page.goBack();
        await this.page.waitForLoadState('networkidle');
      }
    }

    return results;
  }

  /**
   * Test form inputs
   */
  async testFormInput(
    selector: string,
    value: string,
    options: {
      submitButton?: string;
      expectSuccess?: boolean;
      clearFirst?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      const input = await this.page.locator(selector).first();
      
      if (options.clearFirst) {
        await input.clear();
      }
      
      await input.fill(value);
      
      if (options.submitButton) {
        await this.page.locator(options.submitButton).click();
        
        if (options.expectSuccess) {
          // Wait for success indication
          await this.page.waitForTimeout(1000);
        }
      }
      
      console.log(`✅ Successfully filled input: ${selector}`);
      return true;
    } catch (error) {
      console.log(`❌ Failed to fill input ${selector}: ${error}`);
      return false;
    }
  }

  /**
   * Test dropdown/select elements
   */
  async testDropdown(
    selector: string,
    options: string[]
  ): Promise<boolean[]> {
    const results: boolean[] = [];
    
    try {
      const dropdown = await this.page.locator(selector).first();
      
      for (const option of options) {
        try {
          await dropdown.click();
          await this.page.locator(`text="${option}"`).click();
          await this.page.waitForTimeout(500);
          console.log(`✅ Selected option: ${option}`);
          results.push(true);
        } catch (error) {
          console.log(`❌ Failed to select option ${option}: ${error}`);
          results.push(false);
        }
      }
    } catch (error) {
      console.log(`❌ Failed to test dropdown ${selector}: ${error}`);
    }
    
    return results;
  }

  /**
   * Generate test report
   */
  async generateReport(results: ButtonTestResult[]): Promise<string> {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    let report = `# Test Results Report\n\n`;
    report += `## Summary\n`;
    report += `- Total buttons tested: ${results.length}\n`;
    report += `- Successful: ${successful} ✅\n`;
    report += `- Failed: ${failed} ❌\n`;
    report += `- Success rate: ${((successful / results.length) * 100).toFixed(1)}%\n\n`;
    
    report += `## Detailed Results\n\n`;
    
    // Group by success/failure
    report += `### ✅ Successful Clicks\n`;
    results.filter(r => r.success).forEach(r => {
      report += `- **${r.buttonText}** (${r.selector})\n`;
      if (r.responseStatus) {
        report += `  - Response: ${r.responseStatus}\n`;
      }
    });
    
    report += `\n### ❌ Failed Clicks\n`;
    results.filter(r => !r.success).forEach(r => {
      report += `- **${r.buttonText}** (${r.selector})\n`;
      report += `  - Error: ${r.error}\n`;
      if (r.screenshot) {
        report += `  - Screenshot: ${r.screenshot}\n`;
      }
    });
    
    return report;
  }

  /**
   * Wait for element with retry
   */
  async waitForElement(
    selector: string,
    options: {
      timeout?: number;
      state?: 'visible' | 'hidden' | 'attached' | 'detached';
      retries?: number;
    } = {}
  ): Promise<boolean> {
    const maxRetries = options.retries || 3;
    const timeout = options.timeout || 5000;
    const state = options.state || 'visible';
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.page.locator(selector).first().waitFor({ 
          state, 
          timeout 
        });
        return true;
      } catch (error) {
        console.log(`Retry ${i + 1}/${maxRetries} for ${selector}`);
        if (i === maxRetries - 1) {
          console.log(`❌ Element not found after ${maxRetries} retries: ${selector}`);
          return false;
        }
        await this.page.waitForTimeout(1000);
      }
    }
    
    return false;
  }

  /**
   * Check if element exists and is visible
   */
  async elementExists(selector: string): Promise<boolean> {
    try {
      const element = await this.page.locator(selector).first();
      return await element.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get all links on page
   */
  async getAllLinks(): Promise<{ text: string; href: string }[]> {
    return await this.page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      return links.map(link => ({
        text: link.textContent || '',
        href: link.getAttribute('href') || ''
      }));
    });
  }

  /**
   * Test API endpoint through UI interaction
   */
  async testAPIEndpoint(
    triggerSelector: string,
    expectedEndpoint: string,
    options: {
      method?: string;
      expectedStatus?: number;
      validateResponse?: (data: any) => boolean;
    } = {}
  ): Promise<boolean> {
    try {
      const responsePromise = this.page.waitForResponse(
        response => response.url().includes(expectedEndpoint) &&
                   (!options.method || response.request().method() === options.method),
        { timeout: 10000 }
      );
      
      await this.page.locator(triggerSelector).click();
      
      const response = await responsePromise;
      const status = response.status();
      
      if (options.expectedStatus && status !== options.expectedStatus) {
        console.log(`❌ Expected status ${options.expectedStatus}, got ${status}`);
        return false;
      }
      
      if (options.validateResponse) {
        const data = await response.json();
        const isValid = options.validateResponse(data);
        if (!isValid) {
          console.log(`❌ Response validation failed`);
          return false;
        }
      }
      
      console.log(`✅ API endpoint ${expectedEndpoint} responded with ${status}`);
      return true;
      
    } catch (error) {
      console.log(`❌ API test failed: ${error}`);
      return false;
    }
  }
}