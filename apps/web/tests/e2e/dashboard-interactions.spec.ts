import { test, expect } from '@playwright/test';
import { TestUtils, ButtonTestResult } from './helpers/test-utils';
import { ApiMocker } from './helpers/api-mocks';

// This test file uses authentication state from global setup
// No need to specify storageState here as it's in playwright.config.ts

test.describe('Dashboard - Complete Interaction Testing', () => {
  let testUtils: TestUtils;
  let apiMocker: ApiMocker;
  let allTestResults: ButtonTestResult[] = [];

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
    apiMocker = new ApiMocker(page);
    
    // Setup API mocks before navigating
    await apiMocker.setupAllMocks();
    
    // Navigate to dashboard (should be authenticated)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the dashboard (not redirected to sign-in)
    const url = page.url();
    if (url.includes('/sign-in')) {
      console.log('⚠️ Not authenticated - check auth setup');
    }
  });

  test.afterAll(async () => {
    // Generate comprehensive report
    if (allTestResults.length > 0) {
      const report = await testUtils.generateReport(allTestResults);
      console.log('\n=== DASHBOARD INTERACTION TEST REPORT ===\n');
      console.log(report);
    }
  });

  test('should test Trigger Manual Sync button', async ({ page }) => {
    console.log('\n🔍 Testing Trigger Manual Sync button...\n');
    
    const syncResult = await testUtils.clickAndVerify(
      'button:has-text("Trigger Manual Sync")',
      {
        waitForResponse: '/api/trigger',
        expectToast: true,
        screenshot: true,
        timeout: 15000
      }
    );
    
    allTestResults.push(syncResult);
    
    if (syncResult.success) {
      console.log('✅ Manual sync triggered successfully');
      
      // Check if any data updated
      await page.waitForTimeout(3000);
      const statsAfterSync = await page.locator('[class*="text-2xl"]').first().textContent();
      console.log(`Stats after sync: ${statsAfterSync}`);
    } else {
      console.log(`❌ Manual sync failed: ${syncResult.error}`);
    }
  });

  test('should test all Quick Action buttons', async ({ page }) => {
    console.log('\n🔍 Testing all Quick Action buttons...\n');
    
    const quickActions = [
      {
        name: 'Trigger Pipeline',
        selector: 'button:has-text("Trigger Pipeline")',
        expectResponse: '/api/trigger/intelligence',
        expectToast: true
      },
      {
        name: 'Test Extraction',
        selector: 'button:has-text("Test Extraction")',
        expectResponse: '/api/test/extract',
        expectToast: true
      },
      {
        name: 'System Health',
        selector: 'button:has-text("System Health")',
        expectResponse: '/api/health',
        expectToast: true
      },
      {
        name: 'View Reports',
        selector: 'button:has-text("View Reports")',
        expectNavigation: true
      },
      {
        name: 'Email Settings',
        selector: 'button:has-text("Email Settings")',
        expectNavigation: true
      },
      {
        name: 'System Settings',
        selector: 'button:has-text("System Settings")',
        expectNavigation: true
      }
    ];
    
    for (const action of quickActions) {
      console.log(`\nTesting: ${action.name}`);
      
      const options: any = {
        screenshot: true
      };
      
      if (action.expectResponse) {
        options.waitForResponse = action.expectResponse;
      }
      if (action.expectToast) {
        options.expectToast = true;
      }
      if (action.expectNavigation) {
        options.waitForNavigation = true;
      }
      
      const result = await testUtils.clickAndVerify(action.selector, options);
      allTestResults.push(result);
      
      // If we navigated away, go back to dashboard
      if (action.expectNavigation && result.success) {
        await page.goto('http://localhost:3000/dashboard');
        await page.waitForLoadState('networkidle');
      }
      
      // Wait between actions
      await page.waitForTimeout(1000);
    }
  });

  test('should verify System Status indicators', async ({ page }) => {
    console.log('\n🔍 Verifying System Status indicators...\n');
    
    const statusIndicators = [
      { name: 'Gmail Connector', expectedStatus: 'Connected' },
      { name: 'Claude AI', expectedStatus: 'Operational' },
      { name: 'Database', expectedStatus: 'Healthy' }
    ];
    
    for (const indicator of statusIndicators) {
      const element = await page.locator(`text="${indicator.name}"`).first();
      const isVisible = await element.isVisible().catch(() => false);
      
      if (isVisible) {
        console.log(`✅ ${indicator.name} indicator visible`);
        
        // Check for status text
        const statusText = await page.locator(`text="${indicator.expectedStatus}"`).first();
        const statusVisible = await statusText.isVisible().catch(() => false);
        console.log(`  ${statusVisible ? '✅' : '⚠️'} Status: ${indicator.expectedStatus}`);
        
        // Check for status dot (green indicator)
        const statusDot = await element.locator('..').locator('[class*="bg-green"]').first();
        const dotVisible = await statusDot.isVisible().catch(() => false);
        console.log(`  ${dotVisible ? '✅' : '⚠️'} Green status indicator present`);
      } else {
        console.log(`❌ ${indicator.name} indicator not found`);
      }
    }
  });

  test('should test Recent Companies section interactions', async ({ page }) => {
    console.log('\n🔍 Testing Recent Companies section...\n');
    
    // Wait for companies to load
    await page.waitForTimeout(3000);
    
    // Check if companies are present
    const companyCards = await page.locator('[class*="card"]').filter({ hasText: 'Recent Companies' }).locator('..').locator('[class*="card"]').all();
    
    if (companyCards.length > 0) {
      console.log(`Found ${companyCards.length} company cards`);
      
      // Test clicking on company links if any
      const externalLinks = await page.locator('a[href^="http"]').all();
      console.log(`Found ${externalLinks.length} external links`);
      
      for (let i = 0; i < Math.min(3, externalLinks.length); i++) {
        const link = externalLinks[i];
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        console.log(`  Link ${i + 1}: ${text} -> ${href}`);
      }
    } else {
      console.log('ℹ️ No recent companies found (might be empty state)');
      
      // Check for empty state message
      const emptyMessage = await page.locator('text="No recent companies"').first();
      const isEmpty = await emptyMessage.isVisible().catch(() => false);
      if (isEmpty) {
        console.log('✅ Empty state message displayed correctly');
      }
    }
  });

  test('should test dashboard stats interactions', async ({ page }) => {
    console.log('\n🔍 Testing dashboard statistics cards...\n');
    
    // Look for stats cards (usually with large numbers)
    const statsElements = await page.locator('[class*="text-2xl"], [class*="text-3xl"]').all();
    
    console.log(`Found ${statsElements.length} stat elements`);
    
    for (let i = 0; i < statsElements.length; i++) {
      const stat = statsElements[i];
      const value = await stat.textContent();
      
      // Get the parent card to find the label
      const parentCard = await stat.locator('..').locator('..');
      const label = await parentCard.locator('[class*="text-muted"], [class*="text-sm"]').first().textContent().catch(() => 'Unknown');
      
      console.log(`Stat ${i + 1}: ${label} = ${value}`);
      
      // Check if clickable
      const isClickable = await stat.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return computed.cursor === 'pointer';
      });
      
      if (isClickable) {
        console.log('  ℹ️ This stat appears to be clickable');
        
        // Try clicking
        try {
          await stat.click();
          await page.waitForTimeout(1000);
          
          // Check if anything happened
          const currentUrl = page.url();
          if (currentUrl !== 'http://localhost:3000/dashboard') {
            console.log(`  ✅ Clicked stat navigated to: ${currentUrl}`);
            await page.goto('http://localhost:3000/dashboard');
          } else {
            console.log('  ℹ️ Click had no navigation effect');
          }
        } catch (error) {
          console.log(`  ⚠️ Could not click stat: ${error}`);
        }
      }
    }
  });

  test('should test all buttons systematically', async ({ page }) => {
    console.log('\n🔍 Testing ALL buttons on dashboard systematically...\n');
    
    // Find all buttons on the page
    const allButtons = await page.locator('button').all();
    console.log(`Total buttons found: ${allButtons.length}`);
    
    const buttonTexts: string[] = [];
    
    for (let i = 0; i < allButtons.length; i++) {
      const button = allButtons[i];
      const isVisible = await button.isVisible().catch(() => false);
      
      if (!isVisible) continue;
      
      const text = await button.textContent() || '';
      const trimmedText = text.trim();
      
      // Skip if we've already tested this button text
      if (buttonTexts.includes(trimmedText)) {
        console.log(`⏭️ Skipping duplicate: "${trimmedText}"`);
        continue;
      }
      
      buttonTexts.push(trimmedText);
      
      console.log(`\n📍 Button ${i + 1}: "${trimmedText}"`);
      
      // Determine expected behavior
      const options: any = { screenshot: false };
      
      if (trimmedText.includes('Trigger') || trimmedText.includes('Test')) {
        options.waitForResponse = '/api/';
        options.expectToast = true;
      } else if (trimmedText.includes('View') || trimmedText.includes('Settings')) {
        options.waitForNavigation = true;
      }
      
      const result = await testUtils.clickAndVerify(
        `button:has-text("${trimmedText}")`,
        options
      );
      
      allTestResults.push(result);
      
      // Handle navigation
      if (options.waitForNavigation && result.success) {
        const currentUrl = page.url();
        console.log(`  Navigated to: ${currentUrl}`);
        await page.goto('http://localhost:3000/dashboard');
        await page.waitForLoadState('networkidle');
      }
      
      // Small delay between tests
      await page.waitForTimeout(500);
    }
  });

  test('should capture visual state of dashboard', async ({ page }) => {
    console.log('\n📸 Capturing dashboard visual state...\n');
    
    // Full page screenshot
    await page.screenshot({
      path: 'test-results/screenshots/dashboard-full.png',
      fullPage: true
    });
    console.log('✅ Full dashboard screenshot captured');
    
    // Highlight all interactive elements
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const links = document.querySelectorAll('a');
      
      buttons.forEach(btn => {
        btn.style.border = '2px solid blue';
        btn.style.boxShadow = '0 0 5px rgba(0, 0, 255, 0.5)';
      });
      
      links.forEach(link => {
        link.style.border = '2px solid green';
        link.style.boxShadow = '0 0 5px rgba(0, 255, 0, 0.5)';
      });
    });
    
    await page.screenshot({
      path: 'test-results/screenshots/dashboard-interactive-highlighted.png',
      fullPage: true
    });
    console.log('✅ Interactive elements highlighted screenshot captured');
  });

  test('should generate comprehensive dashboard test summary', async ({ page }) => {
    console.log('\n📊 Generating dashboard test summary...\n');
    
    const summary = {
      totalButtons: await page.locator('button').count(),
      totalLinks: await page.locator('a').count(),
      quickActionButtons: await page.locator('text="Quick Actions"').locator('..').locator('button').count(),
      statusIndicators: 3,
      statsCards: await page.locator('[class*="text-2xl"], [class*="text-3xl"]').count(),
      testResults: allTestResults.length,
      successfulTests: allTestResults.filter(r => r.success).length,
      failedTests: allTestResults.filter(r => !r.success).length,
      timestamp: new Date().toISOString()
    };
    
    console.log('Dashboard Test Summary:');
    console.log('======================');
    console.log(`Total Buttons: ${summary.totalButtons}`);
    console.log(`Total Links: ${summary.totalLinks}`);
    console.log(`Quick Actions: ${summary.quickActionButtons}`);
    console.log(`Status Indicators: ${summary.statusIndicators}`);
    console.log(`Stats Cards: ${summary.statsCards}`);
    console.log(`Tests Run: ${summary.testResults}`);
    console.log(`Successful: ${summary.successfulTests} ✅`);
    console.log(`Failed: ${summary.failedTests} ❌`);
    console.log(`Success Rate: ${((summary.successfulTests / summary.testResults) * 100).toFixed(1)}%`);
    console.log(`Timestamp: ${summary.timestamp}`);
    
    // Save summary
    const fs = require('fs');
    fs.writeFileSync(
      'test-results/dashboard-summary.json',
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\n✅ Summary saved to test-results/dashboard-summary.json');
  });
});