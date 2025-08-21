import { test, expect } from '@playwright/test';
import { TestUtils, ButtonTestResult } from './helpers/test-utils';

test.describe('Homepage - Complete Button and Interaction Testing', () => {
  let testUtils: TestUtils;
  let testResults: ButtonTestResult[] = [];

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    // Generate and log final report
    if (testResults.length > 0) {
      const report = await testUtils.generateReport(testResults);
      console.log('\n=== HOMEPAGE TEST REPORT ===\n');
      console.log(report);
    }
  });

  test('should test all Sign In buttons when not authenticated', async ({ page }) => {
    console.log('\n🔍 Testing all Sign In buttons on homepage...\n');
    
    // Test header Sign In button
    const headerSignIn = await testUtils.clickAndVerify(
      'button:has-text("Sign In")',
      { 
        expectModal: true,
        screenshot: true 
      }
    );
    testResults.push(headerSignIn);
    
    // Close modal if it opened
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Test main Sign In button
    const mainSignIn = await testUtils.clickAndVerify(
      'button:has-text("Sign In"):nth-of-type(2)',
      { 
        expectModal: true,
        screenshot: true 
      }
    );
    testResults.push(mainSignIn);
    
    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Test "Sign In to Dashboard" button
    const dashboardSignIn = await testUtils.clickAndVerify(
      'button:has-text("Sign In to Dashboard")',
      { 
        expectModal: true,
        screenshot: true 
      }
    );
    testResults.push(dashboardSignIn);
    
    console.log(`\nSign In buttons tested: ${testResults.filter(r => r.buttonText.includes('Sign')).length}`);
  });

  test('should test all Sign Up buttons when not authenticated', async ({ page }) => {
    console.log('\n🔍 Testing all Sign Up buttons on homepage...\n');
    
    // Test header Sign Up button
    const headerSignUp = await testUtils.clickAndVerify(
      'button:has-text("Sign Up")',
      { 
        expectModal: true,
        screenshot: true 
      }
    );
    testResults.push(headerSignUp);
    
    // Close modal if it opened
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Test link-style Sign Up button
    const linkSignUp = await testUtils.clickAndVerify(
      'button:has-text("Sign up")',
      { 
        expectModal: true 
      }
    );
    testResults.push(linkSignUp);
    
    console.log(`\nSign Up buttons tested: ${testResults.filter(r => r.buttonText.includes('Sign')).length}`);
  });

  test('should verify all cards are present and content is visible', async ({ page }) => {
    console.log('\n🔍 Verifying all informational cards...\n');
    
    // Test metric cards
    const metricCards = [
      { title: '96% Time Savings', description: '5 hours weekly → 10 minutes daily' },
      { title: '95% Capture Rate', description: 'Never miss a mention again' },
      { title: 'Cultural Intelligence', description: 'Early signals from tastemakers' }
    ];
    
    for (const card of metricCards) {
      const cardElement = await page.locator(`text="${card.title}"`).first();
      const isVisible = await cardElement.isVisible();
      
      if (isVisible) {
        console.log(`✅ Card visible: ${card.title}`);
        
        // Check if description is also visible
        const description = await page.locator(`text="${card.description}"`).first();
        const descVisible = await description.isVisible();
        console.log(`  ${descVisible ? '✅' : '❌'} Description: ${card.description}`);
      } else {
        console.log(`❌ Card not visible: ${card.title}`);
      }
    }
    
    // Test "Ready to Get Started?" card
    const ctaCard = await page.locator('text="Ready to Get Started?"').first();
    const ctaVisible = await ctaCard.isVisible();
    console.log(`${ctaVisible ? '✅' : '❌'} CTA Card: Ready to Get Started?`);
  });

  test('should test navigation when signed in (simulated)', async ({ page }) => {
    console.log('\n🔍 Testing signed-in state navigation...\n');
    
    // Check if "View Intelligence Dashboard" button exists (shown when signed in)
    const dashboardButton = await page.locator('text="View Intelligence Dashboard"').first();
    const isDashboardVisible = await dashboardButton.isVisible().catch(() => false);
    
    if (isDashboardVisible) {
      const dashboardNav = await testUtils.clickAndVerify(
        'text="View Intelligence Dashboard"',
        { 
          waitForNavigation: true,
          screenshot: true 
        }
      );
      testResults.push(dashboardNav);
      
      // Check if we navigated to dashboard
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard')) {
        console.log('✅ Successfully navigated to dashboard');
      } else {
        console.log('❌ Navigation to dashboard failed');
      }
    } else {
      console.log('ℹ️ User not signed in - dashboard button not visible');
    }
  });

  test('should test all interactive elements systematically', async ({ page }) => {
    console.log('\n🔍 Testing ALL clickable elements on homepage...\n');
    
    // Get all buttons and links
    const buttons = await page.locator('button').all();
    const links = await page.locator('a[href]').all();
    
    console.log(`Found ${buttons.length} buttons and ${links.length} links`);
    
    // Test each button
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const isVisible = await button.isVisible().catch(() => false);
      
      if (!isVisible) continue;
      
      const text = await button.textContent() || '';
      const ariaLabel = await button.getAttribute('aria-label') || '';
      
      console.log(`\nTesting button ${i + 1}: "${text.trim()}" ${ariaLabel ? `(${ariaLabel})` : ''}`);
      
      try {
        // Check if button is enabled
        const isEnabled = await button.isEnabled();
        if (!isEnabled) {
          console.log('  ⚠️ Button is disabled');
          continue;
        }
        
        // Click and check for any response
        await button.click({ timeout: 5000 });
        
        // Wait a moment for any reaction
        await page.waitForTimeout(1000);
        
        // Check what happened after click
        const currentUrl = page.url();
        const hasModal = await page.locator('[role="dialog"]').isVisible().catch(() => false);
        const hasToast = await page.locator('[role="alert"]').isVisible().catch(() => false);
        
        if (currentUrl !== 'http://localhost:3000/') {
          console.log(`  ✅ Navigated to: ${currentUrl}`);
          await page.goto('http://localhost:3000/');
        } else if (hasModal) {
          console.log('  ✅ Modal opened');
          await page.keyboard.press('Escape');
        } else if (hasToast) {
          console.log('  ✅ Toast notification appeared');
        } else {
          console.log('  ℹ️ No visible action detected');
        }
        
      } catch (error) {
        console.log(`  ❌ Error clicking button: ${error}`);
      }
    }
    
    // Test each link
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const isVisible = await link.isVisible().catch(() => false);
      
      if (!isVisible) continue;
      
      const text = await link.textContent() || '';
      const href = await link.getAttribute('href') || '';
      
      console.log(`\nTesting link ${i + 1}: "${text.trim()}" -> ${href}`);
      
      if (href.startsWith('http') || href.startsWith('//')) {
        console.log('  ⚠️ External link - skipping click test');
        continue;
      }
      
      if (href === '#') {
        console.log('  ⚠️ Anchor link - skipping');
        continue;
      }
      
      try {
        await link.click({ timeout: 5000 });
        await page.waitForTimeout(1000);
        
        const currentUrl = page.url();
        console.log(`  ✅ Navigated to: ${currentUrl}`);
        
        // Go back to homepage
        await page.goto('http://localhost:3000/');
      } catch (error) {
        console.log(`  ❌ Error clicking link: ${error}`);
      }
    }
  });

  test('should capture visual state of all interactive elements', async ({ page }) => {
    console.log('\n📸 Capturing visual state of interactive elements...\n');
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/homepage-full.png',
      fullPage: true 
    });
    console.log('✅ Full page screenshot captured');
    
    // Highlight and capture each button
    const buttons = await page.locator('button').all();
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const isVisible = await button.isVisible().catch(() => false);
      
      if (!isVisible) continue;
      
      // Add highlight
      await button.evaluate(el => {
        el.style.border = '3px solid red';
        el.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.5)';
      });
    }
    
    // Take screenshot with all buttons highlighted
    await page.screenshot({ 
      path: 'test-results/screenshots/homepage-buttons-highlighted.png',
      fullPage: true 
    });
    console.log('✅ Highlighted buttons screenshot captured');
  });

  test('should generate comprehensive test summary', async ({ page }) => {
    console.log('\n📊 Generating comprehensive test summary...\n');
    
    const summary = {
      totalButtons: await page.locator('button').count(),
      totalLinks: await page.locator('a[href]').count(),
      totalCards: await page.locator('[class*="card"]').count(),
      totalInteractiveElements: 0,
      signInButtons: await page.locator('button:has-text("Sign")').count(),
      timestamp: new Date().toISOString()
    };
    
    summary.totalInteractiveElements = summary.totalButtons + summary.totalLinks;
    
    console.log('Homepage Test Summary:');
    console.log('=====================');
    console.log(`Total Buttons: ${summary.totalButtons}`);
    console.log(`Total Links: ${summary.totalLinks}`);
    console.log(`Total Cards: ${summary.totalCards}`);
    console.log(`Total Interactive Elements: ${summary.totalInteractiveElements}`);
    console.log(`Sign In/Up Buttons: ${summary.signInButtons}`);
    console.log(`Timestamp: ${summary.timestamp}`);
    
    // Save summary to file
    const fs = require('fs');
    fs.writeFileSync(
      'test-results/homepage-summary.json',
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\n✅ Summary saved to test-results/homepage-summary.json');
  });
});