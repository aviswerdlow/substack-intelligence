import { test, expect } from '@playwright/test';

test('debug sign-in flow', async ({ page }) => {
  // Navigate to homepage
  await page.goto('http://localhost:3000');
  
  // Take screenshot of homepage
  await page.screenshot({ path: 'test-results/1-homepage.png' });
  
  // Click Sign In button
  await page.click('button:text("Sign In")');
  console.log('Clicked Sign In button');
  
  // Wait for navigation or modal
  await page.waitForTimeout(3000);
  
  // Take screenshot after clicking sign in
  await page.screenshot({ path: 'test-results/2-after-sign-in-click.png', fullPage: true });
  
  // Check current URL
  const url = page.url();
  console.log('Current URL:', url);
  
  // If we're on sign-in page
  if (url.includes('sign-in')) {
    console.log('On sign-in page');
    
    // Look for any inputs
    const inputs = await page.$$('input');
    console.log(`Found ${inputs.length} input fields`);
    
    // Look for buttons
    const buttons = await page.$$('button');
    console.log(`Found ${buttons.length} buttons`);
    
    // Get all button texts
    for (const button of buttons) {
      const text = await button.textContent();
      console.log(`Button: "${text}"`);
    }
    
    // Try to find email input by various selectors
    const emailSelectors = [
      'input[type="email"]',
      'input[name="identifier"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      'input[id*="email" i]'
    ];
    
    let emailFound = false;
    for (const selector of emailSelectors) {
      const input = await page.$(selector);
      if (input && await input.isVisible()) {
        console.log(`Found email input with selector: ${selector}`);
        await input.fill('test+clerk_test@example.com');
        emailFound = true;
        break;
      }
    }
    
    if (!emailFound) {
      console.log('Email input not found, checking for alternative flow...');
      
      // Check if we need to select email option first
      const emailButton = await page.$('button:text("Continue with email")');
      if (emailButton) {
        console.log('Found "Continue with email" button');
        await emailButton.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/3-after-email-option.png' });
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/4-final-state.png', fullPage: true });
  }
});